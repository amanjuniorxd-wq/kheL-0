"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const full_name = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone, bio, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/account");
  return { success: true };
}

export async function requestPasswordReset() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/sign-in");

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/account/reset-password`,
  });

  if (error) throw new Error(error.message);
  return { success: true };
}

/**
 * Permanently deletes the signed-in user's account and profile data.
 * Requires the service-role key because Supabase Auth admin deletion
 * (`auth.admin.deleteUser`) is not exposed to the anon/authenticated
 * roles — this route verifies the caller's own session first, then acts
 * strictly on that user's own id, never an id supplied by the client.
 */
export async function deleteAccount() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const admin = createAdminClient();
  // profiles row cascades from auth.users via `on delete cascade`,
  // which in turn cascades to requests, contributions, etc.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new Error(error.message);

  await supabase.auth.signOut();
  redirect("/");
}
