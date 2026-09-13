import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyRecurringDonations } from "./actions";
import RecurringList from "./RecurringList";

export default async function RecurringDonationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/dashboard/recurring");

  const donations = await listMyRecurringDonations();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Your recurring donations</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Manage or cancel monthly gifts you&rsquo;ve set up. Cancelling stops
        future charges immediately -- it never affects donations already made.
      </p>
      <RecurringList initialDonations={donations as any} />
    </div>
  );
}
