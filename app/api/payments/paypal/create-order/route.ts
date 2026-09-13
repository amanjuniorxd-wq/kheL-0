import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPayPalOrder } from "@/lib/payments/paypal";
import { convertInrToUsd } from "@/lib/payments/fx";

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

  try {
    const { usd, inrPerUsd } = await convertInrToUsd(amount);

    const order = await createPayPalOrder({
      amount: usd,
      currency: "USD",
      donorId: user?.id ?? null,
      requestId,
      originAmountInr: amount,
    });
    return NextResponse.json({ orderId: order.id, usd, inrPerUsd });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PayPal order failed" },
      { status: 502 }
    );
  }
}
