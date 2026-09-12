import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RequestForm from "./RequestForm";

export default async function NewRequestPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/requests/new");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Request support</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Every submission is reviewed, then logged to the public floor
        proceedings ledger once it goes live.
      </p>
      <RequestForm />
    </div>
  );
}
