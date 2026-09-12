import "server-only";
import crypto from "crypto";

const CASHFREE_API_BASE =
  process.env.CASHFREE_ENV === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

/**
 * Creates a Cashfree order for UPI deep-linking (Google Pay, PhonePe,
 * Paytm, BHIM) and local card processing. Returns a `payment_session_id`
 * that the client's Cashfree JS SDK (`cashfree.checkout(...)`) uses to
 * open the drop-in checkout.
 */
export async function createCashfreeOrder(input: {
  orderId: string;
  amount: number;
  donorId: string | null;
  requestId?: string | null;
  customerEmail?: string;
  customerPhone?: string;
}) {
  const res = await fetch(`${CASHFREE_API_BASE}/orders`, {
    method: "POST",
    headers: {
      "x-client-id": process.env.CASHFREE_APP_ID ?? "",
      "x-client-secret": process.env.CASHFREE_SECRET_KEY ?? "",
      "x-api-version": "2023-08-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      order_id: input.orderId,
      order_amount: input.amount,
      order_currency: "INR",
      customer_details: {
        customer_id: input.donorId ?? `guest-${input.orderId}`,
        customer_email: input.customerEmail ?? "donor@example.com",
        customer_phone: input.customerPhone ?? "9999999999",
      },
      order_tags: {
        donor_id: input.donorId ?? "anonymous",
        request_id: input.requestId ?? "",
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Cashfree create order failed: ${await res.text()}`);
  }
  return res.json() as Promise<{ payment_session_id: string; order_id: string }>;
}

/**
 * Cashfree signs webhooks as base64(HMAC-SHA256(timestamp + rawBody,
 * secret)) in the `x-webhook-signature` header, paired with
 * `x-webhook-timestamp`. Verify both are present and the signature matches
 * before trusting the payload.
 */
export function verifyCashfreeWebhook(
  rawBody: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  if (!signature || !timestamp) return false;
  const expected = crypto
    .createHmac("sha256", process.env.CASHFREE_SECRET_KEY ?? "")
    .update(timestamp + rawBody)
    .digest("base64");
  return expected === signature;
}
