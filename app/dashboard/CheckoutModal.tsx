"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import type { SupportRequest } from "@/lib/types";

declare global {
  interface Window {
    Razorpay: any;
    Cashfree: any;
  }
}

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type Gateway = "stripe" | "razorpay" | "cashfree" | "paypal";

const GATEWAY_LABEL: Record<Gateway, string> = {
  stripe: "Card (Visa/Mastercard)",
  razorpay: "UPI — Razorpay",
  cashfree: "UPI — Cashfree",
  paypal: "PayPal / Venmo",
};

/** Only offer gateways whose public key is actually configured. */
const AVAILABLE_GATEWAYS = (Object.keys(GATEWAY_LABEL) as Gateway[]).filter((g) => {
  if (g === "stripe") return !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (g === "razorpay") return !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (g === "cashfree") return !!process.env.NEXT_PUBLIC_CASHFREE_APP_ID;
  if (g === "paypal") return !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  return false;
});

export default function CheckoutModal({
  request,
  onClose,
}: {
  request: SupportRequest;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(1000);
  const [gateway, setGateway] = useState<Gateway>(AVAILABLE_GATEWAYS[0] ?? "razorpay");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStripe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/stripe/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, requestId: request.id }),
      });
      const { clientSecret, error: apiError } = await res.json();
      if (apiError) throw new Error(apiError);

      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load");

      const { error: confirmError } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: { return_url: `${window.location.origin}/dashboard?funded=${request.id}` },
      });
      if (confirmError) throw new Error(confirmError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRazorpay() {
    setLoading(true);
    setError(null);
    try {
      await loadScript("https://checkout.razorpay.com/v1/checkout.js");

      const res = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, requestId: request.id }),
      });
      const { orderId, amount: orderAmount, error: apiError } = await res.json();
      if (apiError) throw new Error(apiError);

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderAmount,
        currency: "INR",
        name: "Sahayata",
        description: `Fund: ${request.title}`,
        order_id: orderId,
        // Surfaces UPI (incl. GPay/PhonePe/Paytm/BHIM intent + QR) first.
        config: { display: { blocks: { upi: { instruments: [{ method: "upi" }] } }, sequence: ["block.upi"], preferences: { show_default_blocks: true } } },
        handler: () => onClose(), // durable credit happens via the webhook
        theme: { color: "#1f7a5c" },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCashfree() {
    setLoading(true);
    setError(null);
    try {
      await loadScript("https://sdk.cashfree.com/js/v3/cashfree.js");

      const res = await fetch("/api/payments/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, requestId: request.id }),
      });
      const { paymentSessionId, error: apiError } = await res.json();
      if (apiError) throw new Error(apiError);

      const cashfree = await window.Cashfree({
        mode: process.env.NEXT_PUBLIC_CASHFREE_ENV === "production" ? "production" : "sandbox",
      });
      await cashfree.checkout({
        paymentSessionId,
        redirectTarget: "_modal",
      });
      onClose(); // durable credit happens via the webhook
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-semibold">Fund &ldquo;{request.title}&rdquo;</h3>
        <p className="mb-4 text-sm text-neutral-500">100% goes toward this request.</p>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Amount (₹)</span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="input"
          />
        </label>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {AVAILABLE_GATEWAYS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGateway(g)}
              className={gateway === g ? "btn-primary text-xs" : "btn-secondary text-xs"}
            >
              {GATEWAY_LABEL[g]}
            </button>
          ))}
        </div>

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {gateway === "paypal" && process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? (
          <PayPalCheckout
            amount={amount}
            requestId={request.id}
            onDone={onClose}
            onError={(m) => setError(m)}
          />
        ) : (
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={
                gateway === "stripe" ? handleStripe : gateway === "cashfree" ? handleCashfree : handleRazorpay
              }
              className="btn-primary"
            >
              {loading ? "Processing…" : `Pay ₹${amount}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PayPalCheckout({
  amount,
  requestId,
  onDone,
  onError,
}: {
  amount: number;
  requestId: string;
  onDone: () => void;
  onError: (message: string) => void;
}) {
  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "",
        currency: "USD",
        components: "buttons",
        enableFunding: "venmo",
      }}
    >
      <div className="space-y-2">
        {(["paypal", "venmo"] as const).map((fundingSource) => (
          <PayPalButtons
            key={fundingSource}
            fundingSource={fundingSource}
            style={{ layout: "horizontal", height: 40 }}
            createOrder={async () => {
              const res = await fetch("/api/payments/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount, requestId, currency: "USD" }),
              });
              const { orderId, error } = await res.json();
              if (error) throw new Error(error);
              return orderId;
            }}
            onApprove={async (data) => {
              const res = await fetch("/api/payments/paypal/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: data.orderID, fundingSource }),
              });
              const result = await res.json();
              if (result.error) {
                onError(result.error);
                return;
              }
              onDone();
            }}
            onError={() => onError("PayPal checkout failed")}
          />
        ))}
      </div>
    </PayPalScriptProvider>
  );
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load payment script"));
    document.body.appendChild(script);
  });
}
