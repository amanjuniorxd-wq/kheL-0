"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupportRequest } from "@/lib/types";
import type { MishrinEntry } from "@/lib/mishrin/types";

interface TransactionRow {
  id: string;
  amount: number;
  provider: string;
  kind: string;
  created_at: string;
  request_id: string | null;
}

export default function AccountActivity({
  userId,
  initialRequests,
  initialTransactions,
  initialLedgerEntries,
}: {
  userId: string;
  initialRequests: SupportRequest[];
  initialTransactions: TransactionRow[];
  initialLedgerEntries: MishrinEntry[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [transactions] = useState(initialTransactions);
  const [ledgerEntries, setLedgerEntries] = useState(initialLedgerEntries);
  const supabase = createClient();

  // Requests: live status/raised_amount updates (e.g. an admin approval or
  // a pool allocation landing) without a page refresh.
  useEffect(() => {
    const channel = supabase
      .channel(`account-requests-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "assistance_requests",
          filter: `requester_id=eq.${userId}`,
        },
        (payload) =>
          setRequests((prev) =>
            prev.map((r) => (r.id === payload.new.id ? { ...r, ...(payload.new as SupportRequest) } : r))
          )
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  // Ledger: any new entry attributed to this user (a submission, a
  // contribution, an admin override naming them) streams in live.
  useEffect(() => {
    const channel = supabase
      .channel(`account-ledger-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "mishrin_ledger",
          filter: `delegate_id=eq.${userId}`,
        },
        (payload) => setLedgerEntries((prev) => [payload.new as MishrinEntry, ...prev].slice(0, 20))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  const lifetimeDonated = useMemo(
    () => transactions.reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions]
  );

  return (
    <>
      <section className="card">
        <h2 className="mb-4 text-lg font-medium">Your requests</h2>
        {requests.length > 0 ? (
          <ul className="divide-y divide-neutral-200">
            {requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-neutral-500">
                    {new Date(r.created_at).toLocaleDateString()} · <StatusBadge status={r.status} />
                  </p>
                </div>
                <p className="tabular-nums text-neutral-700">
                  ₹{r.raised_amount.toLocaleString()} / ₹{r.target_amount.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No requests yet.</p>
        )}
      </section>

      <section className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Your contributions</h2>
          <span className="text-sm font-semibold text-brand-700">
            Lifetime: ₹{lifetimeDonated.toLocaleString()}
          </span>
        </div>
        {transactions.length > 0 ? (
          <ul className="divide-y divide-neutral-200">
            {transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                <p className="text-neutral-600">
                  {new Date(t.created_at).toLocaleDateString()} via {t.provider} ·{" "}
                  {t.kind === "direct_contribution" ? "direct to a request" : "to the pool"}
                </p>
                <p className="tabular-nums font-medium">₹{t.amount.toLocaleString()}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No contributions yet.</p>
        )}
      </section>

      <section className="card">
        <h2 className="mb-4 text-lg font-medium">Your mishrin ledger entries</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Every ledger entry attributed to you, with its hash — cross-check these
          against the public <code>/admin/mishrin-ledger</code> audit table or the
          Floor Proceedings feed on the dashboard.
        </p>
        {ledgerEntries.length > 0 ? (
          <ul className="space-y-2">
            {ledgerEntries.map((e) => (
              <li key={e.id} className="border-b border-neutral-100 pb-2 text-sm last:border-0">
                <p className="text-neutral-700">{e.statement_text}</p>
                <p className="font-mono text-[10px] text-neutral-400">
                  #{e.id} · {e.transaction_hash.slice(0, 20)}… · {new Date(e.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No ledger entries yet.</p>
        )}
      </section>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "active" || status === "funded"
      ? "text-brand-700"
      : status === "rejected"
      ? "text-red-600"
      : "text-neutral-500";
  return <span className={color}>{status.replace("_", " ")}</span>;
}
