import "server-only";

const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID ?? "";
  const secret = process.env.PAYPAL_CLIENT_SECRET ?? "";

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

/**
 * Creates a PayPal order. The same endpoint services both the PayPal and
 * Venmo buttons — Venmo is just a `funding_source` on the client-side
 * PayPalButtons component, the order itself is identical.
 */
export async function createPayPalOrder(input: {
  amount: number;
  currency?: string;
  donorId: string | null;
  requestId?: string | null;
}) {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: input.currency ?? "USD",
            value: input.amount.toFixed(2),
          },
          custom_id: JSON.stringify({
            donor_id: input.donorId ?? "anonymous",
            request_id: input.requestId ?? "",
          }),
        },
      ],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`PayPal create order failed: ${await res.text()}`);
  }
  return res.json() as Promise<{ id: string }>;
}

/**
 * Captures an approved order. Called from the client's onApprove handler
 * for an immediate UX response — the unified webhook (CHECKOUT.ORDER.
 * APPROVED / PAYMENT.CAPTURE.COMPLETED) is the durable, idempotent credit
 * path, so a client that closes the tab mid-capture doesn't lose the
 * donation.
 */
export async function capturePayPalOrder(orderId: string) {
  const token = await getAccessToken();

  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`PayPal capture failed: ${await res.text()}`);
  }
  return res.json();
}

/**
 * Verifies a PayPal webhook using their `verify-webhook-signature` API —
 * PayPal doesn't use a simple HMAC-over-body like Stripe/Razorpay, so the
 * signature is checked by calling back into PayPal with the transmission
 * headers and raw event body.
 */
export async function verifyPayPalWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const token = await getAccessToken();
  const webhookId = process.env.PAYPAL_WEBHOOK_ID ?? "";

  const res = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_time: headers.get("paypal-transmission-time"),
      cert_url: headers.get("paypal-cert-url"),
      auth_algo: headers.get("paypal-auth-algo"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
    cache: "no-store",
  });

  if (!res.ok) return false;
  const data = await res.json();
  return data.verification_status === "SUCCESS";
}
