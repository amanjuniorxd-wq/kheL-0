// Supabase Edge Function: redistribute-pool
//
// Deploy:   supabase functions deploy redistribute-pool
// Schedule: supabase functions schedule redistribute-pool --cron "*/15 * * * *"
//   (or trigger it from a Postgres cron job / pg_cron calling this URL)
//
// Also callable on demand from the admin Engine Controls panel
// (app/admin/mishrin-ledger/actions.ts) with an optional JSON body
// `{ triggeredBy: "<admin user id>" }`, which is recorded in the ledger
// so a manual rebalance is attributed rather than anonymous.
//
// Selects active, unfunded requests, scores them, and allocates the pool's
// available balance in priority order until the pool is exhausted or every
// request is fully funded. Every allocation writes a row to `transactions`
// (kind = 'pool_allocation', which bumps assistance_requests.raised_amount
// via trigger) and an immutable entry to the mishrin_ledger for public
// audit.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface RequestRow {
  id: string;
  target_amount: number;
  raised_amount: number;
  urgency: number; // 1-5
  queue_started_at: string;
}

const WEIGHT_URGENCY = 0.4;
const WEIGHT_QUEUE_TIME = 0.3;
const WEIGHT_NEED_GAP = 0.3;

function priorityScore(req: RequestRow, maxQueueHours: number): number {
  const urgencyNorm = req.urgency / 5; // 0..1
  const queueHours =
    (Date.now() - new Date(req.queue_started_at).getTime()) / (1000 * 60 * 60);
  const queueTimeNorm = maxQueueHours > 0 ? queueHours / maxQueueHours : 0; // 0..1
  const needGap = (req.target_amount - req.raised_amount) / req.target_amount; // 0..1

  return (
    WEIGHT_URGENCY * urgencyNorm +
    WEIGHT_QUEUE_TIME * queueTimeNorm +
    WEIGHT_NEED_GAP * needGap
  );
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  let triggeredBy: string | null = null;
  try {
    const body = await req.json();
    triggeredBy = body?.triggeredBy ?? null;
  } catch {
    // No body (e.g. the cron schedule invokes with none) — fine, this is
    // just an automated run.
  }

  if (triggeredBy) {
    await supabase.rpc("append_mishrin_entry", {
      p_delegate_id: triggeredBy,
      p_event_type: "manual_rebalance_triggered",
      p_statement_text: "Manual pool rebalance triggered from the admin console.",
      p_metadata: {},
    });
  }

  // 1. Available pool balance.
  const { data: summary, error: summaryError } = await supabase
    .rpc("get_pool_summary")
    .single();

  if (summaryError) {
    return json({ error: summaryError.message }, 500);
  }

  let available = Number(summary.available_balance);
  if (available <= 0) {
    return json({ allocated: [], message: "No available pool balance." });
  }

  // 2. Candidate requests: active and not yet fully funded.
  const { data: requests, error: requestsError } = await supabase
    .from("assistance_requests")
    .select("id, target_amount, raised_amount, urgency, queue_started_at")
    .eq("status", "active")
    .lt("raised_amount", "target_amount");

  if (requestsError) {
    return json({ error: requestsError.message }, 500);
  }
  if (!requests || requests.length === 0) {
    return json({ allocated: [], message: "No eligible requests." });
  }

  const maxQueueHours = Math.max(
    ...requests.map(
      (r: RequestRow) => (Date.now() - new Date(r.queue_started_at).getTime()) / 3_600_000
    ),
    1
  );

  const scored = requests
    .map((r: RequestRow) => ({ request: r, score: priorityScore(r, maxQueueHours) }))
    .sort((a, b) => b.score - a.score);

  // 3. Allocate in priority order until the pool runs out.
  const allocations: {
    kind: "pool_allocation";
    request_id: string;
    amount: number;
    provider: "system_pool";
    provider_payment_id: string;
    priority_score: number;
  }[] = [];

  for (const { request, score } of scored) {
    if (available <= 0) break;
    const need = request.target_amount - request.raised_amount;
    const amount = Math.min(need, available);
    if (amount <= 0) continue;

    allocations.push({
      kind: "pool_allocation",
      request_id: request.id,
      amount,
      provider: "system_pool",
      provider_payment_id: `alloc_${crypto.randomUUID()}`,
      priority_score: score,
    });
    available -= amount;
  }

  if (allocations.length === 0) {
    return json({ allocated: [], message: "Nothing to allocate." });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("transactions")
    .insert(allocations)
    .select("id, request_id, amount, priority_score");

  if (insertError) {
    return json({ error: insertError.message }, 500);
  }

  // 4. Immutable public log entry per allocation.
  for (const alloc of inserted ?? []) {
    await supabase.rpc("append_mishrin_entry", {
      p_delegate_id: triggeredBy,
      p_event_type: "pool_allocation",
      p_statement_text: `Automated pool allocation of ₹${alloc.amount} to request ${alloc.request_id} (priority score ${alloc.priority_score.toFixed(4)}).`,
      p_related_request_id: alloc.request_id,
      p_related_transaction_id: alloc.id,
      p_metadata: { priority_score: alloc.priority_score, triggered_by: triggeredBy },
    });
  }

  return json({ allocated: inserted });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
