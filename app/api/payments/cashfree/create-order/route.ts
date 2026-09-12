import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createCashfreeOrder } from "@/lib/payments/cashfree";

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
    const order = await createCashfreeOrder({
      orderId: `sahayata_${randomUUID()}`,
      amount,
      donorId: user?.id ?? null,
      requestId,
      customerEmail: user?.email,
    });
    return NextResponse.json({
      paymentSessionId: order.payment_session_id,
      orderId: order.order_id,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Cashfree order failed" },
      { status: 502 }
    );
  }
}
