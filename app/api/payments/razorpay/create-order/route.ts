import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
  key_secret: process.env.RAZORPAY_KEY_SECRET ?? "",
});

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

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // paise
    currency: "INR",
    notes: {
      donor_id: user?.id ?? "anonymous",
      request_id: requestId ?? "",
      kind: requestId ? "direct_contribution" : "pool_contribution",
    },
  });

  return NextResponse.json({ orderId: order.id, amount: order.amount });
}
