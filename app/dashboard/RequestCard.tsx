"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { SupportRequest, VerificationTier } from "@/lib/types";
import VerificationBadge from "@/components/VerificationBadge";
import CheckoutModal from "./CheckoutModal";

type RequestWithRequester = SupportRequest & {
  requester?: { full_name: string | null; verification_tier: VerificationTier } | null;
};

export default function RequestCard({ request }: { request: RequestWithRequester }) {
  const [current, setCurrent] = useState(request);
  const [modalOpen, setModalOpen] = useState(false);
  const supabase = createClient();

  // Live-update this one card whenever its row changes (a new allocation
  // or contribution bumps raised_amount via the DB trigger).
  useEffect(() => {
    const channel = supabase
      .channel(`request-${request.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "assistance_requests",
          filter: `id=eq.${request.id}`,
        },
        (payload) => setCurrent((prev) => ({ ...prev, ...(payload.new as SupportRequest) }))
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [request.id, supabase]);

  const pct = Math.min(
    100,
    Math.round((current.raised_amount / current.target_amount) * 100)
  );

  return (
    <div className="card flex flex-col gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-brand-600">
          {current.category.replace("_", " ")}
        </p>
        <h3 className="font-medium">{current.title}</h3>
        {current.requester && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
            {current.requester.full_name ?? "Anonymous requester"}
            <VerificationBadge tier={current.requester.verification_tier} />
          </p>
        )}
      </div>

      <p className="line-clamp-3 text-sm text-neutral-600">{current.description}</p>

      <div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-neutral-500">
          <span>
            ₹{current.raised_amount.toLocaleString()} of ₹
            {current.target_amount.toLocaleString()}
          </span>
          <span>{pct}%</span>
        </div>
      </div>

      <button onClick={() => setModalOpen(true)} className="btn-primary mt-1">
        Fund now
      </button>

      {modalOpen && (
        <CheckoutModal request={current} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}
