import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

/**
 * Creates a Stripe PaymentIntent for either a direct "Fund Now" on one
 * request, or a general pool contribution (requestId omitted). The
 * amount is always taken from the trusted request body server-side —
 * never trust a client-sent total on its own without also verifying it
 * against provider webhooks before crediting anything (see webhook route).
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { amount, requestId } = (await req.json()) as {
    amount: number;
    requestId?: string;
  };

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // paise/cents
    currency: "inr",
    metadata: {
      donor_id: user?.id ?? "anonymous",
      request_id: requestId ?? "",
      kind: requestId ? "direct_contribution" : "pool_contribution",
    },
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
