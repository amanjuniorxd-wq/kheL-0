import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { appendMishrinEntry } from "@/lib/mishrin/server";

export type PaymentProvider =
  | "stripe"
  | "razorpay"
  | "cashfree"
  | "paypal"
  | "venmo";

export interface CreditInput {
  provider: PaymentProvider;
  providerPaymentId: string;
  amount: number; // in the ledger's base currency unit (rupees), not paise/cents
  donorId: string | null;
  requestId: string | null;
  currency?: string;
  /** Extra context folded into the mishrin ledger entry's metadata, e.g. { funding_source: "venmo" }. */
  extraMetadata?: Record<string, unknown>;
}

/**
 * Single point where money becomes a row in the database, used by every
 * gateway's webhook/capture handler (Stripe, Razorpay, Cashfree, PayPal,
 * Venmo — Venmo transactions arrive as PayPal orders with funding_source
 * "venmo", so they share this same path). Writes into the consolidated
 * `transactions` table (see migration 0006) as `kind: 'direct_contribution'`
 * when a request is being funded directly, or `'pool_contribution'` for a
 * general donation to the redistribution pool.
 *
 * Idempotent: `provider_payment_id` is UNIQUE on `transactions`, so a
 * replayed webhook (all providers retry on a non-2xx response, and some
 * retry even after a 2xx) is a no-op here instead of double-crediting a
 * request. Only a first-time insert writes a mishrin ledger entry.
 */
export async function creditContribution(input: CreditInput) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("transactions")
    .insert({
      kind: input.requestId ? "direct_contribution" : "pool_contribution",
      request_id: input.requestId,
      donor_id: input.donorId,
      amount: input.amount,
      currency: input.currency ?? "INR",
      provider: normalizeProviderColumn(input.provider),
      provider_payment_id: input.providerPaymentId,
      status: "succeeded",
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation → we've already credited this payment id.
    if ((error as { code?: string }).code === "23505") {
      return { credited: false as const, reason: "duplicate" as const };
    }
    throw new Error(`Failed to credit transaction: ${error.message}`);
  }

  const label = input.requestId ? "Direct contribution" : "Pool contribution";
  await appendMishrinEntry({
    delegateId: input.donorId,
    eventType: "contribution_received",
    statementText: `${label} of ₹${input.amount.toLocaleString()} received via ${input.provider}.`,
    relatedRequestId: input.requestId,
    relatedTransactionId: data?.id ?? null,
    metadata: {
      provider: input.provider,
      provider_payment_id: input.providerPaymentId,
      amount: input.amount,
      ...input.extraMetadata,
    },
  });

  return { credited: true as const, id: data?.id as string };
}

/**
 * `transactions.provider` constrains to `'stripe' | 'razorpay' |
 * 'cashfree' | 'paypal' | 'system_pool'` (migration 0006). Venmo payments
 * arrive as PayPal orders, so they're stored as provider = 'paypal' with
 * the funding source recorded in the ledger entry's metadata instead.
 */
function normalizeProviderColumn(provider: PaymentProvider): string {
  return provider === "venmo" ? "paypal" : provider;
}
