"use server";

import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

export async function listMyRecurringDonations() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("recurring_donations")
    .select(
      "id, amount, currency, status, created_at, canceled_at, request_id, assistance_requests(title)"
    )
    .eq("donor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Cancels a donor's own recurring donation. Cancels the Stripe
 * subscription itself (no further renewal charges will ever happen),
 * then marks our record canceled immediately so the UI reflects it
 * without waiting on the customer.subscription.deleted webhook, which
 * still arrives afterward and performs the same update idempotently.
 */
export async function cancelRecurringDonation(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("recurring_donations")
    .select("id, donor_id, stripe_subscription_id, status")
    .eq("id", id)
    .single();

  if (error || !row) throw new Error("Recurring donation not found");
  if (row.donor_id !== user.id) throw new Error("Not authorized");
  if (row.status === "canceled") return { ok: true };

  await stripe.subscriptions.cancel(row.stripe_subscription_id);

  await admin
    .from("recurring_donations")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/dashboard/recurring");
  return { ok: true };
}
