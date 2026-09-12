"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "./actions";
import type { Profile } from "@/lib/types";

export default function AccountForm({ profile }: { profile: Profile | null }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        await updateProfile(formData);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Full name</span>
        <input
          name="full_name"
          defaultValue={profile?.full_name ?? ""}
          className="input"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Phone</span>
        <input name="phone" defaultValue={profile?.phone ?? ""} className="input" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Bio</span>
        <textarea
          name="bio"
          rows={3}
          defaultValue={profile?.bio ?? ""}
          className="input"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-brand-600">Saved.</p>}

      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
