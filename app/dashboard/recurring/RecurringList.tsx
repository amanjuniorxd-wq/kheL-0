"use client";

import { useState, useTransition } from "react";
import { cancelRecurringDonation } from "./actions";

type Donation = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  canceled_at: string | null;
  request_id: string | null;
  assistance_requests: { title: string } | null;
};

export default function RecurringList({
  initialDonations,
}: {
  initialDonations: Donation[];
}) {
  const [donations, setDonations] = useState(initialDonations);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      try {
        await cancelRecurringDonation(id);
        setDonations((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, status: "canceled", canceled_at: new Date().toISOString() }
              : d
          )
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not cancel");
      } finally {
        setPendingId(null);
      }
    });
  }

  if (donations.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        You don&rsquo;t have any recurring donations yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {donations.map((d) => (
        <div
          key={d.id}
          className="flex items-center justify-between rounded-xl border border-neutral-200 p-4"
        >
          <div>
            <p className="font-medium">
              ₹{d.amount.toLocaleString()} / month
              {d.assistance_requests?.title
                ? ` -- ${d.assistance_requests.title}`
                : " -- General pool"}
            </p>
            <p className="text-xs text-neutral-500">
              Status: {d.status} · Started {new Date(d.created_at).toLocaleDateString()}
            </p>
          </div>
          {d.status === "active" && (
            <button
              type="button"
              disabled={isPending && pendingId === d.id}
              onClick={() => handleCancel(d.id)}
              className="btn-secondary text-xs"
            >
              {isPending && pendingId === d.id ? "Cancelling…" : "Cancel"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
