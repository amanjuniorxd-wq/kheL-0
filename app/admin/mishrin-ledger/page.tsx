import { createClient } from "@/lib/supabase/server";
import EngineControls from "./EngineControls";
import RequestOverridePanel from "./RequestOverridePanel";
import LiveFloorFeed from "./LiveFloorFeed";
import LedgerAuditTable from "./LedgerAuditTable";
import VerificationPanel from "./VerificationPanel";

export default async function MishrinLedgerAdminPage() {
  // requireAdmin() already ran in app/admin/layout.tsx for this whole
  // route subtree — no need to repeat the check here.
  const supabase = createClient();

  const [{ data: pendingRequests }, { data: ledgerEntries }] = await Promise.all([
    supabase
      .from("assistance_requests")
      .select("*")
      .eq("status", "pending_review")
      .order("created_at", { ascending: true }),
    supabase
      .from("mishrin_ledger")
      .select("*, delegate:profiles!delegate_id(full_name, verification_tier)")
      .order("id", { ascending: false })
      .limit(25),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mishrin Ledger — Admin Console</h1>
        <p className="text-sm text-neutral-600">
          Full oversight of floor proceedings, request submissions, payment gateway
          logs, and automated pool payouts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <EngineControls />
        <LiveFloorFeed />
      </div>

      <RequestOverridePanel requests={pendingRequests ?? []} />

      <VerificationPanel />

      <LedgerAuditTable initialEntries={ledgerEntries ?? []} />
    </div>
  );
}
