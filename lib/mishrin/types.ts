export type MishrinEventType =
  | "request_submitted"
  | "floor_statement"
  | "pool_allocation"
  | "contribution_received"
  | "request_status_changed"
  | "audit_verification"
  | "manual_rebalance_triggered"
  | "admin_override";

import type { VerificationTier } from "@/lib/types";

export interface MishrinEntry {
  id: number;
  delegate_id: string | null;
  /** Present only when the query embeds it, e.g. `.select("*, delegate:profiles!delegate_id(...)")`. */
  delegate?: { full_name: string | null; verification_tier: VerificationTier } | null;
  event_type: MishrinEventType;
  statement_text: string;
  related_request_id: string | null;
  related_transaction_id: string | null;
  metadata: Record<string, unknown>;
  prev_hash: string;
  transaction_hash: string;
  created_at: string;
}
