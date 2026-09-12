"use client";

import { useState, useTransition } from "react";
import { deleteAccount, requestPasswordReset } from "./actions";

export default function DangerZone() {
  const [isPending, startTransition] = useTransition();
  const [resetSent, setResetSent] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm text-neutral-600">
          Send a password reset link to your email.
        </p>
        <button
          className="btn-secondary"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await requestPasswordReset();
              setResetSent(true);
            })
          }
        >
          {resetSent ? "Reset link sent" : "Send password reset email"}
        </button>
      </div>

      <div className="border-t border-neutral-200 pt-6">
        <p className="mb-2 text-sm text-neutral-600">
          Deleting your account permanently removes your profile, requests,
          and contribution history. Type <strong>DELETE</strong> to confirm.
        </p>
        <div className="flex gap-2">
          <input
            className="input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
          />
          <button
            className="btn-primary bg-red-600 hover:bg-red-700"
            disabled={confirmText !== "DELETE" || isPending}
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await deleteAccount();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Failed to delete account");
                }
              })
            }
          >
            Delete account
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
