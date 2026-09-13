import { NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";
import { creditContribution } from "@/lib/payments/credit";
import { verifyCashfreeWebhook } from "@/lib/payments/cashfree";
import { verifyPayPalWebhook } from "@/lib/payments/paypal";
import { createAdminClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

/**
 * Single inbound endpoint for every payment gateway (Stripe, Razorpay,
 * Cashfree, PayPal/Venmo). Point each provider's dashboard webhook config
 * here: https://<your-domain>/api/webhooks/payments
 *
 * The provider is identified by which signature header is present, then
 * verified with that provider's own scheme before anything is trusted --
 * a request with none of the recognized headers is rejected outright.
 * Every path funnels into creditContribution(), which is idempotent on
 * provider_payment_id, so provider retries never double-credit.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const headers = req.headers;

  if (headers.get("stripe-signature")) {
    return handleStripe(rawBody, headers.get("stripe-signature")!);
  }
  if (headers.get("x-razorpay-signature")) {
    return handleRazorpay(rawBody, headers.get("x-razorpay-signature")!);
  }
  if (headers.get("x-webhook-signature") && headers.get("x-webhook-timestamp")) {
    return handleCashfree(rawBody, headers.get("x-webhook-signature"), headers.get("x-webhook-timestamp"));
  }
  if (headers.get("paypal-transmission-sig")) {
    return handlePayPal(rawBody, headers);
  }

  return NextResponse.json({ error: "Unrecognized webhook source" }, { status: 400 });
}

async function handleStripe(rawBody: string, signature: string) {
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET ?? "");
  } catch (err) {
    return NextResponse.json({ error: `Stripe signature invalid: ${(err as Error).message}` }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const donorId = intent.metadata.donor_id !== "anonymous" ? intent.metadata.donor_id : null;

    await creditContribution({
      provider: "stripe",
      providerPaymentId: intent.id,
      amount: intent.amount / 100,
      donorId: donorId || null,
      requestId: intent.metadata.request_id || null,
      currency: intent.currency.toUpperCase(),
    });
  }

  // A donor just finished Stripe Checkout in subscription mode (see
  // /api/payments/stripe/create-subscription). This only persists the
  // recurring_donations record -- the actual money is credited by
  // invoice.payment_succeeded below (fired for every billing cycle,
  // including the first), so this never double-credits.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "subscription" && session.subscription && session.customer) {
      const admin = createAdminClient();
      const donorId = session.metadata?.donor_id || null;
      const requestId = session.metadata?.request_id || null;

      await admin.from("recurring_donations").upsert(
        {
          donor_id: donorId,
          request_id: requestId,
          amount: (session.amount_total ?? 0) / 100,
          currency: (session.currency ?? "inr").toUpperCase(),
          stripe_customer_id: String(session.customer),
          stripe_subscription_id: String(session.subscription),
          status: "active",
        },
        { onConflict: "stripe_subscription_id" }
      );
    }
  }

  // Fired for every subscription billing cycle, including the first --
  // this is the single place a recurring donation actually becomes a
  // credited transaction + mishrin ledger entry, mirroring one-time
  // contributions via the same creditContribution() call.
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    if (invoice.subscription) {
      const subscription = await stripe.subscriptions.retrieve(String(invoice.subscription));
      const donorId = subscription.metadata?.donor_id || null;
      const requestId = subscription.metadata?.request_id || null;

      await creditContribution({
        provider: "stripe",
        providerPaymentId:
          typeof invoice.payment_intent === "string" ? invoice.payment_intent : invoice.id,
        amount: invoice.amount_paid / 100,
        donorId,
        requestId,
        currency: invoice.currency.toUpperCase(),
        extraMetadata: { recurring: true, invoice_id: invoice.id },
      });
    }
  }

  // Subscription cancelled (by us via the dashboard action, or for
  // repeated payment failures on Stripe's side) -- keep our record in
  // sync so the UI stops offering "Cancel" on something already gone.
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const admin = createAdminClient();
    await admin
      .from("recurring_donations")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("stripe_subscription_id", subscription.id);
  }

  return NextResponse.json({ received: true });
}

async function handleRazorpay(rawBody: string, signature: string) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET ?? "")
    .update(rawBody)
    .digest("hex");

  if (expected !== signature) {
    return NextResponse.json({ error: "Razorpay signature invalid" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const donorId = payment.notes?.donor_id !== "anonymous" ? payment.notes?.donor_id : null;

    await creditContribution({
      provider: "razorpay",
      providerPaymentId: payment.id,
      amount: payment.amount / 100,
      donorId: donorId || null,
      requestId: payment.notes?.request_id || null,
      currency: (payment.currency ?? "INR").toUpperCase(),
      extraMetadata: { method: payment.method },
    });
  }

  return NextResponse.json({ received: true });
}

async function handleCashfree(rawBody: string, signature: string | null, timestamp: string | null) {
  if (!verifyCashfreeWebhook(rawBody, signature, timestamp)) {
    return NextResponse.json({ error: "Cashfree signature invalid" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {
    const payment = event.data.payment;
    const order = event.data.order;
    const tags = order?.order_tags ?? {};
    const donorId = tags.donor_id && tags.donor_id !== "anonymous" ? tags.donor_id : null;

    await creditContribution({
      provider: "cashfree",
      providerPaymentId: String(payment.cf_payment_id),
      amount: Number(payment.payment_amount),
      donorId,
      requestId: tags.request_id || null,
      currency: order?.order_currency ?? "INR",
      extraMetadata: { method: payment.payment_group },
    });
  }

  return NextResponse.json({ received: true });
}

async function handlePayPal(rawBody: string, headers: Headers) {
  const verified = await verifyPayPalWebhook(headers, rawBody);
  if (!verified) {
    return NextResponse.json({ error: "PayPal signature invalid" }, { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const resource = event.resource;
    const custom = JSON.parse(resource.custom_id || "{}") as {
      donor_id?: string;
      request_id?: string;
      origin_amount_inr?: number | null;
    };
    const donorId = custom.donor_id && custom.donor_id !== "anonymous" ? custom.donor_id : null;
    const fundingSource = resource.payment_source && Object.keys(resource.payment_source)[0];

    const hasOriginInr = typeof custom.origin_amount_inr === "number";
    const creditAmount = hasOriginInr ? (custom.origin_amount_inr as number) : Number(resource.amount.value);
    const creditCurrency = hasOriginInr ? "INR" : resource.amount.currency_code;

    await creditContribution({
      provider: fundingSource === "venmo" ? "venmo" : "paypal",
      providerPaymentId: resource.id,
      amount: creditAmount,
      donorId,
      requestId: custom.request_id || null,
      currency: creditCurrency,
      extraMetadata: {
        funding_source: fundingSource ?? "paypal",
        settled_amount: resource.amount.value,
        settled_currency: resource.amount.currency_code,
      },
    });
  }

  return NextResponse.json({ received: true });
}
