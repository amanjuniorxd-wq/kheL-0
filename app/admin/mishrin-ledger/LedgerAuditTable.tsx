"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MishrinEntry, MishrinEventType } from "@/lib/mishrin/types";
import VerificationBadge from "@/components/VerificationBadge";

const EVENT_TYPES: MishrinEventType[] = [
  "request_submitted",
  "floor_statement",
  "pool_allocation",
  "contribution_received",
  "request_status_changed",
  "audit_verification",
  "manual_rebalance_triggered",
  "admin_override",
];

const PAGE_SIZE = 25;

export default function LedgerAuditTable({ initialEntries }: { initialEntries: MishrinEntry[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [eventFilter, setEventFilter] = useState<MishrinEventType | "all">("all");
  const [delegateFilter, setDelegateFilter] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // New entries stream in at the top regardless of the current filter —
  // filtering happens client-side over what's loaded.
  useEffect(() => {
    const channel = supabase
      .channel("admin-ledger-audit")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mishrin_ledger" },
        (payload) => setEntries((prev) => [payload.new as MishrinEntry, ...prev])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function loadMore() {
    setLoading(true);
    const nextPage = page + 1;
    const { data } = await supabase
      .from("mishrin_ledger")
      .select("*, delegate:profiles!delegate_id(full_name, verification_tier)")
      .order("id", { ascending: false })
      .range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1);

    if (data && data.length > 0) {
      setEntries((prev) => [...prev, ...(data as MishrinEntry[])]);
      setPage(nextPage);
    }
    setLoading(false);
  }

  const filtered = entries.filter((e) => {
    if (eventFilter !== "all" && e.event_type !== eventFilter) return false;
    if (delegateFilter && !e.delegate_id?.includes(delegateFilter) && !e.statement_text.toLowerCase().includes(delegateFilter.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">System-wide ledger audit</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value as MishrinEventType | "all")}
            className="input w-auto text-xs"
          >
            <option value="all">All event types</option>
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input
            placeholder="Filter by delegate id or text…"
            value={delegateFilter}
            onChange={(e) => setDelegateFilter(e.target.value)}
            className="input w-56 text-xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase text-neutral-500">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Event</th>
              <th className="py-2 pr-3">Delegate</th>
              <th className="py-2 pr-3">Amount</th>
              <th className="py-2 pr-3">Statement</th>
              <th className="py-2 pr-3">Timestamp</th>
              <th className="py-2 pr-3">Hash</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 align-top">
                <td className="py-2 pr-3 text-neutral-400">{e.id}</td>
                <td className="py-2 pr-3">{e.event_type.replace(/_/g, " ")}</td>
                <td className="py-2 pr-3 text-xs text-neutral-500">
                  {e.delegate_id ? (
                    <span className="flex items-center gap-1">
                      <span className="font-mono">{e.delegate?.full_name ?? `${e.delegate_id.slice(0, 8)}…`}</span>
                      {e.delegate && <VerificationBadge tier={e.delegate.verification_tier} />}
                    </span>
                  ) : (
                    "system"
                  )}
                </td>
                <td className="py-2 pr-3 tabular-nums">
                  {typeof e.metadata?.amount === "number" ? `₹${(e.metadata.amount as number).toLocaleString()}` : "—"}
                </td>
                <td className="max-w-xs py-2 pr-3 text-neutral-600">{e.statement_text}</td>
                <td className="py-2 pr-3 text-xs text-neutral-400">
                  {new Date(e.created_at).toLocaleString()}
                </td>
                <td className="py-2 pr-3 font-mono text-[10px] text-neutral-400" title={e.transaction_hash}>
                  {e.transaction_hash.slice(0, 10)}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-neutral-500">No entries match these filters.</p>
      )}

      <div className="mt-4 flex justify-center">
        <button onClick={loadMore} disabled={loading} className="btn-secondary text-xs">
          {loading ? "Loading…" : "Load more"}
        </button>
      </div>
    </div>
  );
}
