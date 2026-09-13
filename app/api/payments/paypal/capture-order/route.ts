import { NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/payments/paypal";
import { creditContribution } from "@/lib/payments/credit";

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
      origin_amount_inr?: number | null;
    };

    const hasOriginInr = typeof custom.origin_amount_inr === "number";
    const creditAmount = hasOriginInr ? (custom.origin_amount_inr as number) : Number(captureNode.amount.value);
    const creditCurrency = hasOriginInr ? "INR" : captureNode.amount.currency_code;

    const result = await creditContribution({
      provider: fundingSource === "venmo" ? "venmo" : "paypal",
      providerPaymentId: captureNode.id,
      amount: creditAmount,
      donorId: custom.donor_id && custom.donor_id !== "anonymous" ? custom.donor_id : null,
      requestId: custom.request_id || null,
      currency: creditCurrency,
      extraMetadata: {
        funding_source: fundingSource ?? "paypal",
        settled_amount: captureNode.amount.value,
        settled_currency: captureNode.amount.currency_code,
      },
    });

    return NextResponse.json({ status: "COMPLETED", credited: result.credited });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Capture failed" },
      { status: 502 }
    );
  }
}
