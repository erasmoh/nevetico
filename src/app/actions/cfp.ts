"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const proposalSchema = z.object({
  event_id: z.uuid(),
  title: z.string().min(3).max(200),
  abstract: z.string().min(10).max(5000),
  format: z.enum(["talk", "workshop", "lightning", "panel"]).default("talk"),
  duration_minutes: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().positive().max(480).nullable()),
  speaker_name: z.string().min(1).max(120),
  speaker_email: z.email(),
  speaker_bio: z.string().max(2000).optional(),
  speaker_link: z.string().url().optional().or(z.literal("")),
});

export type CfpFormState = {
  ok?: boolean;
  error?: string;
  errors?: Partial<Record<string, string>>;
} | undefined;

export async function submitCfpProposal(
  _state: CfpFormState,
  formData: FormData,
): Promise<CfpFormState> {
  const parsed = proposalSchema.safeParse({
    event_id: formData.get("event_id"),
    title: formData.get("title"),
    abstract: formData.get("abstract"),
    format: formData.get("format"),
    duration_minutes: formData.get("duration_minutes"),
    speaker_name: formData.get("speaker_name"),
    speaker_email: formData.get("speaker_email"),
    speaker_bio: formData.get("speaker_bio"),
    speaker_link: formData.get("speaker_link"),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "_");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("cfp_proposals").insert({
    event_id: d.event_id,
    title: d.title,
    abstract: d.abstract,
    format: d.format,
    duration_minutes: d.duration_minutes,
    speaker_name: d.speaker_name,
    speaker_email: d.speaker_email,
    speaker_bio: d.speaker_bio ?? null,
    speaker_link: d.speaker_link || null,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function voteProposal(
  proposalId: string,
  email: string,
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: proposal } = await supabase
    .from("cfp_proposals")
    .select("status")
    .eq("id", proposalId)
    .maybeSingle();
  if (!proposal || proposal.status !== "approved") {
    return { error: "Propuesta no disponible para votación." };
  }
  const { error } = await supabase.from("cfp_votes").insert({
    proposal_id: proposalId,
    email: email.toLowerCase(),
  });
  if (error) {
    if (error.code === "23505") return { error: "Ya votaste por esta propuesta." };
    return { error: error.message };
  }
  return { ok: true };
}

export async function setProposalStatus(
  proposalId: string,
  status: "approved" | "rejected",
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cfp_proposals")
    .update({ status })
    .eq("id", proposalId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/events/[id]/cfp", "page");
  return { ok: true };
}
