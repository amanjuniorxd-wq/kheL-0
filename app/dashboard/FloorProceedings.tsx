"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MishrinEntry } from "@/lib/mishrin/types";
import VerificationBadge from "@/components/VerificationBadge";

const EVENT_LABEL: Record<MishrinEntry["event_type"], string> = {
  request_submitted: "Request submitted",
  floor_statement: "Floor statement",
  pool_allocation: "Pool allocation",
  contribution_received: "Contribution received",
  request_status_changed: "Status changed",
  audit_verification: "Audit verification",
  manual_rebalance_triggered: "Manual rebalance triggered",
  admin_override: "Admin override",
};

/**
 * Reads directly from the mishrin_ledger (publicly readable, append-only
 * — see supabase/migrations/0002_mishrin_ledger.sql) and stays live via
 * Supabase Realtime. This is the public, tamper-evident audit trail: every
 * request submission, floor statement, and pool payout appears here the
 * moment it's written server-side.
 */
export default function FloorProceedings() {
  const [entries, setEntries] = useState<MishrinEntry[]>([]);
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    supabase
      .from("mishrin_ledger")
      .select("*, delegate:profiles!delegate_id(full_name, verification_tier)")
      .order("id", { ascending: false })
      .limit(25)
      .then(({ data }) => {
        if (active && data) setEntries(data as MishrinEntry[]);
      });

    const channel = supabase
      .channel("mishrin-ledger-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mishrin_ledger" },
        (payload) => {
          // Realtime payloads are raw rows with no join — the delegate's
          // badge appears on this entry once a normal refetch picks it up.
          setEntries((prev) => [payload.new as MishrinEntry, ...prev].slice(0, 25));
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-medium">Floor Proceedings</h2>
        <span className="text-xs text-neutral-400">Live · hash-chained</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-neutral-500">No entries yet.</p>
      ) : (
        <ol className="max-h-96 space-y-3 overflow-y-auto text-sm">
          {entries.map((entry) => (
            <li key={entry.id} className="border-b border-neutral-100 pb-2 last:border-0">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="flex items-center gap-1">
                  {EVENT_LABEL[entry.event_type]}
                  {entry.delegate?.full_name && (
                    <>
                      · {entry.delegate.full_name}
                      <VerificationBadge tier={entry.delegate.verification_tier} />
                    </>
                  )}
                </span>
                <span>{new Date(entry.created_at).toLocaleString()}</span>
              </div>
              <p className="text-neutral-700">{entry.statement_text}</p>
              <p className="truncate font-mono text-[10px] text-neutral-400" title={entry.transaction_hash}>
                #{entry.id} · {entry.transaction_hash.slice(0, 16)}…
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
