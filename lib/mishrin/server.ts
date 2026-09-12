import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { MishrinEntry, MishrinEventType } from "@/lib/mishrin/types";

/**
 * Appends one immutable entry to the mishrin_ledger via the
 * append_mishrin_entry() Postgres function, which computes the hash
 * chain server-side (see supabase/migrations/0002_mishrin_ledger.sql).
 *
 * Server-only: uses the service-role key because regular users have no
 * insert grant on mishrin_ledger — every entry must be attributable to
 * a verified server-side event (a validated form submission, a webhook-
 * confirmed payment, an Edge Function allocation run), never a raw
 * client write.
 */
export async function appendMishrinEntry(input: {
  delegateId: string | null;
  eventType: MishrinEventType;
  statementText: string;
  relatedRequestId?: string | null;
  relatedTransactionId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<MishrinEntry> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("append_mishrin_entry", {
    p_delegate_id: input.delegateId,
    p_event_type: input.eventType,
    p_statement_text: input.statementText,
    p_related_request_id: input.relatedRequestId ?? null,
    p_related_transaction_id: input.relatedTransactionId ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(`mishrin ledger write failed: ${error.message}`);
  }

  return data as MishrinEntry;
}

/**
 * Verifies the hash chain over a page of entries (oldest first). Returns
 * the index of the first broken link, or null if the chain holds.
 * Recompute from genesis (id = 1) for a full public audit.
 */
export function verifyMishrinChain(entries: MishrinEntry[]): number | null {
  for (let i = 1; i < entries.length; i++) {
    if (entries[i].prev_hash !== entries[i - 1].transaction_hash) {
      return i;
    }
  }
  return null;
}
