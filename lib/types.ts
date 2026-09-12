export type RequestCategory =
  | "medical"
  | "education"
  | "housing"
  | "disaster_relief"
  | "livelihood"
  | "other";

export type RequestStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "funded"
  | "closed"
  | "rejected";

export type ProfileRole = "user" | "admin";

/**
 * Instagram-style verification tiers, lightest to heaviest. `cosmic` is
 * singular — a partial unique index (migration 0008) guarantees at most
 * one profile holds it at any time, by convention reserved for the
 * ledger's own namesake/creator account ("Mishrin, creator of cosmos").
 */
export type VerificationTier = "none" | "meme" | "govt" | "govt_authority" | "cosmic";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  role: ProfileRole;
  verification_tier: VerificationTier;
  created_at: string;
  updated_at: string;
}

export interface SupportRequest {
  id: string;
  requester_id: string;
  title: string;
  category: RequestCategory;
  description: string;
  target_amount: number;
  raised_amount: number;
  urgency: number; // 1-5
  status: RequestStatus;
  document_urls: string[];
  queue_started_at: string;
  created_at: string;
  updated_at: string;
}

export type TransactionKind = "direct_contribution" | "pool_contribution" | "pool_allocation";
export type TransactionProvider = "stripe" | "razorpay" | "cashfree" | "paypal" | "system_pool";

/**
 * Consolidated ledger of all money movement: a donor funding a request
 * directly, a donor funding the general pool, or the pool automatically
 * allocating to a request (kind = 'pool_allocation', provider =
 * 'system_pool'). See supabase/migrations/0006_schema_consolidation.sql.
 */
export interface Transaction {
  id: string;
  kind: TransactionKind;
  request_id: string | null;
  donor_id: string | null;
  amount: number;
  currency: string;
  provider: TransactionProvider;
  provider_payment_id: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  priority_score: number | null;
  created_at: string;
}

/**
 * Minimal typed schema for the Supabase client generics. Regenerate the
 * full version with `supabase gen types typescript` once the project is
 * linked, and swap it in here.
 */
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      assistance_requests: {
        Row: SupportRequest;
        Insert: Omit<SupportRequest, "id" | "raised_amount" | "status" | "queue_started_at" | "created_at" | "updated_at"> &
          Partial<Pick<SupportRequest, "status">>;
        Update: Partial<SupportRequest>;
      };
      transactions: {
        Row: Transaction;
        Insert: Omit<Transaction, "id" | "status" | "created_at"> & Partial<Pick<Transaction, "status">>;
        Update: Partial<Transaction>;
      };
    };
  };
}
