"use client";

import { useState, useTransition } from "react";
import type { Profile, VerificationTier } from "@/lib/types";
import VerificationBadge from "@/components/VerificationBadge";
import { findProfileByEmail, grantVerificationBadge } from "./actions";

const TIER_OPTIONS: { value: VerificationTier; label: string }[] = [
  { value: "none", label: "None (revoke)" },
  { value: "meme", label: "Meme — community verified" },
  { value: "govt", label: "Govt — verified government account" },
  { value: "govt_authority", label: "Govt Authority — verified oversight body" },
  { value: "cosmic", label: "Cosmic — creator of cosmos (singular, only one at a time)" },
];

export default function VerificationPanel() {
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<(Profile & { email?: string }) | null | undefined>(undefined);
  const [tier, setTier] = useState<VerificationTier>("meme");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function search() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const profile = await findProfileByEmail(email.trim());
        setFound(profile);
        if (profile) setTier(profile.verification_tier);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lookup failed.");
      }
    });
  }

  function grant() {
    if (!found) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const updated = await grantVerificationBadge(found.id, tier);
        setFound((prev) => (prev ? { ...prev, verification_tier: updated.verification_tier } : prev));
        setMessage(
          tier === "none"
            ? `Badge revoked for ${found.email ?? found.full_name ?? found.id}.`
            : `"${tier}" badge granted to ${found.email ?? found.full_name ?? found.id}.`
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update badge.");
      }
    });
  }

  return (
    <div className="card">
      <h2 className="mb-1 text-lg font-medium">Verification badges</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Instagram-style tiers, lightest to heaviest — meme, govt, govt authority,
        and a singular cosmic tick reserved for Mishrin, creator of cosmos. Every
        grant or revoke is written to the ledger below.
      </p>

      <div className="mb-3 flex gap-2">
        <input
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
        <button onClick={search} disabled={isPending || !email.trim()} className="btn-secondary">
          Look up
        </button>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-3 text-sm text-brand-700">{message}</p>}

      {found === null && <p className="text-sm text-neutral-500">No user found with that email.</p>}

      {found && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-neutral-50 p-3">
          <span className="flex items-center gap-1 text-sm font-medium">
            {found.full_name ?? found.email}
            <VerificationBadge tier={found.verification_tier} />
          </span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as VerificationTier)}
            className="input w-auto text-xs"
          >
            {TIER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button onClick={grant} disabled={isPending} className="btn-primary text-xs">
            {isPending ? "Saving…" : "Apply"}
          </button>
        </div>
      )}
    </div>
  );
}
