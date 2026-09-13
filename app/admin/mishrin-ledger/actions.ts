"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyMishrinChain } from "@/lib/mishrin/server";
import type { MishrinEntry } from "@/lib/mishrin/types";
import type { RequestStatus, VerificationTier, ProfileRole, Profile } from "@/lib/types";

/**
 * Approve / reject / flag a request. Runs as the signed-in admin's own
 * session (not the service-role key) so the "Admins can update any
 * request" RLS policy (migration 0007) is the thing actually enforcing
 * this, not just the requireAdmin() check in this file — if the role
 * check here ever drifted from the DB policy, the DB wins.
 */
export async function overrideRequestStatus(requestId: string, status: RequestStatus, reason?: string) {
  const { userId } = await requireAdmin();
  const supabase = createClient();

  const { data: request, error } = await supabase
    .from("assistance_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .select("id, title")
    .single();

  if (error || !request) {
    throw new Error(error?.message ?? "Could not update request status.");
  }

  await supabase.rpc("admin_append_mishrin_entry", {
    p_event_type: "admin_override",
    p_statement_text: `Request "${request.title}" status set to "${status}" by admin.${
      reason ? ` Reason: ${reason}` : ""
    }`,
    p_related_request_id: requestId,
    p_metadata: { new_status: status, admin_id: userId, reason: reason ?? null },
  });

  revalidatePath("/admin/mishrin-ledger");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Invokes the redistribute-pool Edge Function on demand, attributed to
 * the calling admin (so the resulting mishrin_ledger entries carry their
 * user id rather than looking like an anonymous scheduled run).
 */
export async function triggerRebalance() {
  const { userId } = await requireAdmin();

  const functionsUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/redistribute-pool`;

  const res = await fetch(functionsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ triggeredBy: userId }),
  });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result.error ?? "Rebalance failed");
  }

  revalidatePath("/admin/mishrin-ledger");
  revalidatePath("/dashboard");
  return result as { allocated: unknown[]; message?: string };
}

/**
 * Recomputes the hash chain over the full ledger (paginated in batches of
 * 1000) and records the result as its own attributed ledger entry — so
 * "we verified the chain and it held" is itself a public, auditable fact.
 */
export async function runAuditVerification() {
  const { userId } = await requireAdmin();
  const supabase = createClient();

  const entries: MishrinEntry[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("mishrin_ledger")
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;
    entries.push(...(data as MishrinEntry[]));
    if (data.length < pageSize) break;
  }

  const brokenAtIndex = verifyMishrinChain(entries);
  const passed = brokenAtIndex === null;

  await supabase.rpc("admin_append_mishrin_entry", {
    p_event_type: "audit_verification",
    p_statement_text: passed
      ? `Full-chain audit verification passed across ${entries.length} entries.`
      : `Audit verification FAILED — hash chain broken at entry #${entries[brokenAtIndex!]?.id}.`,
    p_metadata: {
      admin_id: userId,
      entries_checked: entries.length,
      passed,
      broken_at_entry_id: passed ? null : entries[brokenAtIndex!]?.id,
    },
  });

  revalidatePath("/admin/mishrin-ledger");
  return { passed, entriesChecked: entries.length, brokenAtEntryId: passed ? null : entries[brokenAtIndex!]?.id };
}

/**
 * Looks a user up by email (via the service-role admin client, since
 * emails live on auth.users, not the publicly-readable profiles table)
 * so the admin console can grant a badge without needing raw user ids.
 */
export async function findProfileByEmail(email: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw new Error(error.message);

  const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!match) return null;

  const { data: profile } = await admin.from("profiles").select("*").eq("id", match.id).single();
  return profile ? { ...(profile as Profile), email: match.email } : null;
}

/**
 * Grants (or revokes, via tier: 'none') a verification badge. Goes
 * through set_verification_tier() (migration 0008) rather than a direct
 * UPDATE, so it only ever touches the verification_tier column, enforces
 * the "only one cosmic badge" rule atomically, and writes its own ledger
 * entry — all inside one is_admin()-gated Postgres function, not this
 * server action's own judgment.
 */
export async function grantVerificationBadge(targetId: string, tier: VerificationTier) {
  await requireAdmin();
  const supabase = createClient();

  const { data, error } = await supabase.rpc("set_verification_tier", {
    p_target_id: targetId,
    p_tier: tier,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/mishrin-ledger");
  revalidatePath("/dashboard");
  revalidatePath("/account");
  return data as Profile;
}

/**
 * Lists every profile currently holding the admin role, so the panel can
 * show who has access without a SQL console. Profiles are publicly
 * readable (migration 0001's "viewable by everyone" policy), so this
 * runs on the caller's own session — requireAdmin() just gates the page.
 */
export async function listAdmins() {
  await requireAdmin();
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "admin")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Profile[];
}

/**
 * Promotes or demotes a user's role. Goes through set_user_role()
 * (migration 0009) rather than a direct UPDATE, so it only ever touches
 * the `role` column, refuses to demote the last remaining admin, and
 * writes its own ledger entry — the same pattern grantVerificationBadge()
 * uses for set_verification_tier().
 */
export async function setUserRole(targetId: string, role: ProfileRole) {
  await requireAdmin();
  const supabase = createClient();

  const { data, error } = await supabase.rpc("set_user_role", {
    p_target_id: targetId,
    p_role: role,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/admin/mishrin-ledger");
  return data as Profile;
}
