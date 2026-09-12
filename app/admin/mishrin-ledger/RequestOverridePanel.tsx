"use client";

import { useState, useTransition } from "react";
import type { SupportRequest } from "@/lib/types";
import { overrideRequestStatus } from "./actions";

export default function RequestOverridePanel({ requests }: { requests: SupportRequest[] }) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  function handle(requestId: string, status: "active" | "rejected" | "closed") {
    setError(null);
    setPendingId(requestId);
    startTransition(async () => {
      try {
        const label = status === "active" ? "Approved" : status === "rejected" ? "Rejected" : "Flagged";
        await overrideRequestStatus(requestId, status, `${label} by admin console`);
        setResolved((prev) => new Set(prev).add(requestId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Override failed.");
      } finally {
        setPendingId(null);
      }
    });
  }

  const visible = requests.filter((r) => !resolved.has(r.id));

  return (
    <div className="card">
      <h2 className="mb-4 text-lg font-medium">Request status overrides</h2>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {visible.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing pending review.</p>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {visible.map((r) => (
            <li key={r.id} className="py-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-neutral-500">
                    {r.category.replace("_", " ")} · ₹{r.target_amount.toLocaleString()} · urgency {r.urgency}
                  </p>
                </div>
                <span className="text-xs text-neutral-400">{r.status}</span>
              </div>
              <p className="mb-2 line-clamp-2 text-xs text-neutral-500">{r.description}</p>
              <div className="flex gap-2">
                <button
                  disabled={isPending && pendingId === r.id}
                  onClick={() => handle(r.id, "active")}
                  className="btn-primary text-xs"
                >
                  Approve
                </button>
                <button
                  disabled={isPending && pendingId === r.id}
                  onClick={() => handle(r.id, "rejected")}
                  className="btn-secondary text-xs"
                >
                  Reject
                </button>
                <button
                  disabled={isPending && pendingId === r.id}
                  onClick={() => handle(r.id, "closed")}
                  className="btn-secondary text-xs"
                >
                  Flag / close
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
