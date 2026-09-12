import { createClient } from "@/lib/supabase/server";
import RequestCard from "./RequestCard";
import PoolWidget from "./PoolWidget";
import FloorProceedings from "./FloorProceedings";

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: requests } = await supabase
    .from("assistance_requests")
    .select("*, requester:profiles!requester_id(full_name, verification_tier)")
    .eq("status", "active")
    .order("urgency", { ascending: false });

  const { data: poolTotals } = await supabase.rpc("get_pool_summary").maybeSingle();

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <h1 className="text-2xl font-semibold">Active requests</h1>
        {requests && requests.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            No active requests right now — check back soon.
          </p>
        )}
      </div>

      <div className="space-y-6">
        <PoolWidget initialSummary={poolTotals} />
        <FloorProceedings />
      </div>
    </div>
  );
}
