"use client";

import { useState, useTransition } from "react";
import type { Profile, ProfileRole } from "@/lib/types";
import { findProfileByEmail, listAdmins, setUserRole } from "./actions";

export default function AdminsPanel({ initialAdmins }: { initialAdmins: Profile[] }) {
  const [admins, setAdmins] = useState<Profile[]>(initialAdmins);
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<(Profile & { email?: string }) | null | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refreshAdmins() {
    startTransition(async () => {
      try {
        setAdmins(await listAdmins());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not refresh admin list.");
      }
    });
  }

  function search() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const profile = await findProfileByEmail(email.trim());
        setFound(profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lookup failed.");
      }
    });
  }

  function apply(role: ProfileRole) {
    if (!found) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const updated = await setUserRole(found.id, role);
        setFound((prev) => (prev ? { ...prev, role: updated.role } : prev));
        setMessage(
          role === "admin"
            ? `${found.email ?? found.full_name ?? found.id} promoted to admin.`
            : `${found.email ?? found.full_name ?? found.id} demoted to user.`
        );
        refreshAdmins();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not update role.");
      }
    });
  }

  return (
    <div className="card">
      <h2 className="mb-1 text-lg font-medium">Admins</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Promote or demote a user's role by email. Every change is written to
        the ledger below, and the last remaining admin can't be demoted —
        there's always at least one way back into this console.
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
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-neutral-50 p-3">
          <span className="text-sm font-medium">{found.full_name ?? found.email}</span>
          <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium uppercase text-neutral-600">
            {found.role}
          </span>
          {found.role === "admin" ? (
            <button onClick={() => apply("user")} disabled={isPending} className="btn-secondary text-xs">
              {isPending ? "Saving…" : "Demote to user"}
            </button>
          ) : (
            <button onClick={() => apply("admin")} disabled={isPending} className="btn-primary text-xs">
              {isPending ? "Saving…" : "Promote to admin"}
            </button>
          )}
        </div>
      )}

      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Current admins ({admins.length})
      </h3>
      <ul className="divide-y divide-neutral-100 text-sm">
        {admins.map((admin) => (
          <li key={admin.id} className="flex items-center justify-between py-2">
            <span>{admin.full_name ?? admin.id}</span>
            <span className="text-xs text-neutral-400">
              since {new Date(admin.updated_at).toLocaleDateString()}
            </span>
          </li>
        ))}
        {admins.length === 0 && <li className="py-2 text-neutral-500">No admins found.</li>}
      </ul>
    </div>
  );
}
