import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

/**
 * Starts an opt-in recurring (monthly) donation. Uses Stripe Checkout in
 * subscription mode rather than a raw PaymentIntent -- Checkout handles
 * card collection, 3D Secure, and every future off-session renewal charge
 * for us. Stripe supports INR-denominated subscriptions natively, so
 * (unlike the PayPal flow) no currency conversion is needed here.
 *
 * The donor only ever gets charged again because Stripe bills the
 * subscription on its normal monthly cycle -- there is no path in this
 * app that charges a card without an explicit Checkout confirmation.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in required for recurring donations" },
      { status: 401 }
    );
  }

  const { amount, requestId, requestTitle, origin } = (await req.json()) as {
    amount: number; // rupees per month
    requestId?: string;
    requestTitle?: string;
    origin: string;
  };

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!origin) {
    return NextResponse.json({ error: "Missing origin" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "inr",
            unit_amount: Math.round(amount * 100),
            recurring: { interval: "month" },
            product_data: {
              name: requestTitle
                ? `Monthly donation -- ${requestTitle}`
                : "Monthly donation -- Sahayata general pool",
            },
          },
        },
      ],
      metadata: {
        donor_id: user.id,
        request_id: requestId ?? "",
      },
      subscription_data: {
        metadata: {
          donor_id: user.id,
          request_id: requestId ?? "",
        },
      },
      success_url: `${origin}/dashboard?recurring=started`,
      cancel_url: `${origin}/dashboard?recurring=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not start recurring donation" },
      { status: 502 }
    );
  }
}
