import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPayPalOrder } from "@/lib/payments/paypal";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { amount, requestId, currency } = (await req.json()) as {
    amount: number;
    requestId?: string;
    currency?: string;
  };

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    const order = await createPayPalOrder({
      amount,
      currency,
      donorId: user?.id ?? null,
      requestId,
    });
    return NextResponse.json({ orderId: order.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PayPal order failed" },
      { status: 502 }
    );
  }
}
