import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccountForm from "./AccountForm";
import DangerZone from "./DangerZone";
import AccountActivity from "./AccountActivity";
import VerificationBadge from "@/components/VerificationBadge";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account");

  const [{ data: profile }, { data: requests }, { data: transactions }, { data: ledgerEntries }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("assistance_requests")
        .select("*")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("id, amount, provider, kind, created_at, request_id")
        .eq("donor_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("mishrin_ledger")
        .select("*")
        .eq("delegate_id", user.id)
        .order("id", { ascending: false })
        .limit(20),
    ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Account settings</h1>
        <p className="flex items-center gap-2 text-sm text-neutral-600">
          {user.email}
          {profile && <VerificationBadge tier={profile.verification_tier} />}
          {profile?.role === "admin" && (
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
              Admin
            </span>
          )}
        </p>
      </div>

      <section className="card">
        <h2 className="mb-4 text-lg font-medium">Profile</h2>
        <AccountForm profile={profile} />
      </section>

      <AccountActivity
        userId={user.id}
        initialRequests={requests ?? []}
        initialTransactions={transactions ?? []}
        initialLedgerEntries={ledgerEntries ?? []}
      />

      <section className="card border-red-200">
        <h2 className="mb-4 text-lg font-medium text-red-700">Security &amp; account</h2>
        <DangerZone />
      </section>
    </div>
  );
}
