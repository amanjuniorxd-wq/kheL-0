"use client";

import { useState, useTransition } from "react";
import { triggerRebalance, runAuditVerification } from "./actions";

export default function EngineControls() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"neutral" | "error" | "success">("neutral");

  function handleRebalance() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await triggerRebalance();
        setMessageTone("success");
        setMessage(
          result.message ?? `Allocated to ${result.allocated?.length ?? 0} request(s).`
        );
      } catch (err) {
        setMessageTone("error");
        setMessage(err instanceof Error ? err.message : "Rebalance failed.");
      }
    });
  }

  function handleAudit() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await runAuditVerification();
        setMessageTone(result.passed ? "success" : "error");
        setMessage(
          result.passed
            ? `Chain verified across ${result.entriesChecked} entries.`
            : `Chain broken at entry #${result.brokenAtEntryId}.`
        );
      } catch (err) {
        setMessageTone("error");
        setMessage(err instanceof Error ? err.message : "Audit run failed.");
      }
    });
  }

  return (
    <div className="card">
      <h2 className="mb-1 text-lg font-medium">Engine controls</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Every action here writes an attributed entry to the ledger below.
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={handleRebalance} disabled={isPending} className="btn-primary">
          {isPending ? "Working…" : "Trigger manual pool rebalance"}
        </button>
        <button onClick={handleAudit} disabled={isPending} className="btn-secondary">
          {isPending ? "Working…" : "Run audit verification"}
        </button>
      </div>
      {message && (
        <p
          className={
            "mt-3 text-sm " +
            (messageTone === "error"
              ? "text-red-600"
              : messageTone === "success"
              ? "text-brand-700"
              : "text-neutral-600")
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}
