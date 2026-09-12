"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface PoolSummary {
  total_contributed: number;
  total_allocated: number;
  available_balance: number;
}

export default function PoolWidget({
  initialSummary,
}: {
  initialSummary: PoolSummary | null;
}) {
  const [summary, setSummary] = useState<PoolSummary | null>(initialSummary);
  const supabase = createClient();

  useEffect(() => {
    // Any new pool contribution or allocation changes the summary — cheap
    // enough to just refetch the RPC rather than reconcile client-side.
    const channel = supabase
      .channel("pool-summary")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        refetch
      )
      .subscribe();

    async function refetch() {
      const { data } = await supabase.rpc("get_pool_summary").maybeSingle();
      if (data) setSummary(data as PoolSummary);
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="card">
      <h2 className="mb-3 text-lg font-medium">Automated Redistribution Pool</h2>
      <dl className="space-y-2 text-sm">
        <Row label="Total contributed" value={summary?.total_contributed} />
        <Row label="Allocated to requests" value={summary?.total_allocated} />
        <Row label="Available balance" value={summary?.available_balance} highlight />
      </dl>
      <p className="mt-3 text-xs text-neutral-500">
        Funds are allocated automatically by priority score (urgency, queue
        time, need gap) — see the Floor Proceedings feed for every payout.
      </p>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value?: number; highlight?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={highlight ? "font-semibold text-brand-700" : "text-neutral-700"}>
        ₹{(value ?? 0).toLocaleString()}
      </dd>
    </div>
  );
}
