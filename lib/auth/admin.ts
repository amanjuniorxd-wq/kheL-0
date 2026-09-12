import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Server-side guard for every /admin route. Redirects to sign-in if
 * there's no session, and to the dashboard (not a 404 — no need to
 * reveal that an admin route exists) if the signed-in user isn't an
 * admin. Call this at the top of each admin page/layout and each admin
 * server action — defense in depth alongside the `is_admin()` RLS checks
 * and the admin_append_mishrin_entry() function's own check, so a bug in
 * one layer doesn't expose the others.
 */
export async function requireAdmin(): Promise<{ userId: string; profile: Profile }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/admin/mishrin-ledger");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return { userId: user.id, profile };
}
