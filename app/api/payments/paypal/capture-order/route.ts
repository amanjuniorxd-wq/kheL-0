import { NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/payments/paypal";
import { creditContribution } from "@/lib/payments/credit";

/**
 * Called from the client's PayPalButtons onApprove handler for a fast UX
 * response. Safe to call even though the unified webhook also credits the
 * same payment: creditContribution() is idempotent on provider_payment_id,
 * so whichever path lands first wins and the other is a no-op.
 */
export async function POST(req: Request) {
  const { orderId, fundingSource } = (await req.json()) as {
    orderId: string;
    fundingSource?: "paypal" | "venmo";
  };

  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  try {
    const capture = await capturePayPalOrder(orderId);
    const purchaseUnit = capture.purchase_units?.[0];
    const captureNode = purchaseUnit?.payments?.captures?.[0];

    if (!captureNode || captureNode.status !== "COMPLETED") {
      return NextResponse.json({ error: "Capture not completed" }, { status: 402 });
    }

    const custom = JSON.parse(purchaseUnit.custom_id || "{}") as {
      donor_id?: string;
      request_id?: string;
    };

    const result = await creditContribution({
      provider: fundingSource === "venmo" ? "venmo" : "paypal",
      providerPaymentId: captureNode.id,
      amount: Number(captureNode.amount.value),
      donorId: custom.donor_id && custom.donor_id !== "anonymous" ? custom.donor_id : null,
      requestId: custom.request_id || null,
      currency: captureNode.amount.currency_code,
      extraMetadata: { funding_source: fundingSource ?? "paypal" },
    });

    return NextResponse.json({ status: "COMPLETED", credited: result.credited });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Capture failed" },
      { status: 502 }
    );
  }
}
