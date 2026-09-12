"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MishrinEntry } from "@/lib/mishrin/types";
import VerificationBadge from "@/components/VerificationBadge";

/**
 * Unfiltered real-time stream of every ledger write as it happens —
 * "the floor feed" — distinct from the searchable/paginated audit table
 * below it. Audio transcripts and free-form delegate statements land here
 * as `event_type: 'floor_statement'` entries (the mishrin ledger's
 * `metadata` jsonb can carry an `audio_url` alongside the transcript
 * text in `statement_text` — nothing else in the schema needs to change
 * to support that).
 */
export default function LiveFloorFeed() {
  const [entries, setEntries] = useState<MishrinEntry[]>([]);
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    supabase
      .from("mishrin_ledger")
      .select("*, delegate:profiles!delegate_id(full_name, verification_tier)")
      .order("id", { ascending: false })
      .limit(15)
      .then(({ data }) => {
        if (active && data) setEntries(data as MishrinEntry[]);
      });

    const channel = supabase
      .channel("admin-floor-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mishrin_ledger" },
        (payload) => setEntries((prev) => [payload.new as MishrinEntry, ...prev].slice(0, 15))
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
        <h2 className="text-lg font-medium">Live floor feed</h2>
        <span className="flex items-center gap-1 text-xs text-brand-600">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-500" /> live
        </span>
      </div>
      <ol className="max-h-80 space-y-2 overflow-y-auto text-sm">
        {entries.map((e) => (
          <li key={e.id} className="border-b border-neutral-100 pb-2 last:border-0">
            <div className="flex justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                {e.event_type.replace(/_/g, " ")}
                {e.delegate?.full_name && (
                  <>
                    · {e.delegate.full_name}
                    <VerificationBadge tier={e.delegate.verification_tier} />
                  </>
                )}
              </span>
              <span>{new Date(e.created_at).toLocaleTimeString()}</span>
            </div>
            <p className="text-neutral-700">{e.statement_text}</p>
            {typeof e.metadata?.audio_url === "string" && (
              <audio controls src={e.metadata.audio_url as string} className="mt-1 h-8 w-full" />
            )}
          </li>
        ))}
        {entries.length === 0 && <p className="text-sm text-neutral-500">Waiting for activity…</p>}
      </ol>
    </div>
  );
}
