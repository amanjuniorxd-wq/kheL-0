"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestSchema } from "@/lib/validations/request";
import { appendMishrinEntry } from "@/lib/mishrin/server";

export interface CreateRequestState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createRequest(
  _prev: CreateRequestState,
  formData: FormData
): Promise<CreateRequestState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/requests/new");

  const raw = {
    title: formData.get("title"),
    category: formData.get("category"),
    target_amount: formData.get("target_amount"),
    urgency: formData.get("urgency"),
    description: formData.get("description"),
  };

  const parsed = requestSchema.omit({ documents: true }).safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  // Upload any attached documents to Supabase Storage first.
  const documentUrls: string[] = [];
  const files = formData.getAll("documents") as File[];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("request-documents")
      .upload(path, file);
    if (uploadError) {
      return { error: `Document upload failed: ${uploadError.message}` };
    }
    const { data: publicUrl } = supabase.storage
      .from("request-documents")
      .getPublicUrl(path);
    documentUrls.push(publicUrl.publicUrl);
  }

  const { data: request, error: insertError } = await supabase
    .from("assistance_requests")
    .insert({
      requester_id: user.id,
      title: parsed.data.title,
      category: parsed.data.category,
      target_amount: parsed.data.target_amount,
      urgency: parsed.data.urgency,
      description: parsed.data.description,
      document_urls: documentUrls,
      status: "pending_review",
    })
    .select("id, title")
    .single();

  if (insertError || !request) {
    return { error: insertError?.message ?? "Could not create request." };
  }

  // Immutable, publicly auditable record of the submission.
  await appendMishrinEntry({
    delegateId: user.id,
    eventType: "request_submitted",
    statementText: `Request "${request.title}" submitted for review.`,
    relatedRequestId: request.id,
    metadata: {
      category: parsed.data.category,
      target_amount: parsed.data.target_amount,
      urgency: parsed.data.urgency,
    },
  });

  redirect(`/dashboard?created=${request.id}`);
}
