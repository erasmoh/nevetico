"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { enqueueCampaignRecipients } from "@/lib/email/send-campaign";
import { BLOCK_DEFS } from "@/lib/blocks";
import type { Json } from "@/lib/database.types";

const blockTypes = new Set(BLOCK_DEFS.map((b) => b.type));

const blocksSchema = z
  .array(
    z.object({
      type: z.string(),
      config: z.record(z.string(), z.unknown()),
    }),
  )
  .max(50)
  .superRefine((blocks, ctx) => {
    for (const b of blocks) {
      if (!blockTypes.has(b.type)) {
        ctx.addIssue({
          code: "custom",
          path: ["type"],
          message: `Tipo de bloque desconocido: ${b.type}`,
        });
      }
    }
  });

const updateSchema = z.object({
  name: z.string().min(1).max(120),
  subject: z.string().max(200),
  preheader: z.string().max(200).optional(),
  blocks: blocksSchema,
  segment_id: z.string().uuid().optional().or(z.literal("")).nullable(),
  event_id: z.string().uuid().optional().or(z.literal("")).nullable(),
});

export type CampaignActionState = { ok?: boolean; error?: string } | undefined;

async function slugForCampaign(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("email_campaigns")
    .select("calendar:calendars(slug)")
    .eq("id", campaignId)
    .maybeSingle();
  return (data?.calendar as { slug: string } | null)?.slug ?? null;
}

/** Crea una campaña en borrador y redirige al editor. */
export async function createCampaign(calendarSlug: string): Promise<never> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?from=dashboard");

  const { data: cal } = await supabase
    .from("calendars")
    .select("id")
    .eq("slug", calendarSlug)
    .maybeSingle();
  if (!cal) redirect("/dashboard/calendars");

  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({
      calendar_id: cal.id,
      name: "Nueva campaña",
      subject: "Tu asunto aquí",
      blocks: [],
      status: "draft",
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) redirect(`/dashboard/calendars/${calendarSlug}/emails`);

  redirect(`/dashboard/calendars/${calendarSlug}/emails/${data.id}`);
}

export async function updateCampaign(
  campaignId: string,
  _state: CampaignActionState,
  raw: {
    name: string;
    subject: string;
    preheader?: string;
    blocks: unknown;
    segmentId?: string | null;
    eventId?: string | null;
  },
): Promise<CampaignActionState> {
  const parsed = updateSchema.safeParse({
    name: raw.name,
    subject: raw.subject,
    preheader: raw.preheader,
    blocks: raw.blocks,
    segment_id: raw.segmentId ?? null,
    event_id: raw.eventId ?? null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_campaigns")
    .update({
      name: d.name,
      subject: d.subject,
      preheader: d.preheader ?? null,
      blocks: d.blocks as unknown as Json,
      segment_id: d.segment_id || null,
      event_id: d.event_id || null,
    })
    .eq("id", campaignId);
  if (error) return { error: error.message };

  const slug = await slugForCampaign(supabase, campaignId);
  if (slug) {
    revalidatePath(`/dashboard/calendars/${slug}/emails/${campaignId}`);
    revalidatePath(`/dashboard/calendars/${slug}/emails`);
  }
  return { ok: true };
}

export async function deleteCampaign(campaignId: string): Promise<CampaignActionState> {
  const supabase = await createClient();
  const slug = await slugForCampaign(supabase, campaignId);
  const { error } = await supabase.from("email_campaigns").delete().eq("id", campaignId);
  if (error) return { error: error.message };
  if (slug) revalidatePath(`/dashboard/calendars/${slug}/emails`);
  return { ok: true };
}

const scheduleSchema = z.string().datetime();

export async function scheduleCampaign(
  campaignId: string,
  iso: string,
): Promise<CampaignActionState> {
  const parsed = scheduleSchema.safeParse(iso);
  if (!parsed.success) return { error: "Fecha de programación inválida." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_campaigns")
    .update({ status: "scheduled", scheduled_for: parsed.data })
    .eq("id", campaignId)
    .in("status", ["draft", "scheduled"]);
  if (error) return { error: error.message };
  const slug = await slugForCampaign(supabase, campaignId);
  if (slug) revalidatePath(`/dashboard/calendars/${slug}/emails/${campaignId}`);
  return { ok: true };
}

export async function unscheduleCampaign(
  campaignId: string,
): Promise<CampaignActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("email_campaigns")
    .update({ status: "draft", scheduled_for: null })
    .eq("id", campaignId)
    .eq("status", "scheduled");
  if (error) return { error: error.message };
  const slug = await slugForCampaign(supabase, campaignId);
  if (slug) revalidatePath(`/dashboard/calendars/${slug}/emails/${campaignId}`);
  return { ok: true };
}

export type SendResult = {
  ok?: boolean;
  enqueued?: number;
  skipped?: number;
  error?: string;
};

export async function sendCampaignNow(campaignId: string): Promise<SendResult> {
  const supabase = await createClient();
  // Verificar propiedad antes de encolar (RLS ya filtra, pero el encolado usa
  // admin client; hacemos un check explícito con el user client).
  const { data } = await supabase
    .from("email_campaigns")
    .select("id")
    .eq("id", campaignId)
    .maybeSingle();
  if (!data) return { error: "No tienes acceso a esta campaña." };

  const r = await enqueueCampaignRecipients(campaignId);
  if (r.error) return { error: r.error };

  const slug = await slugForCampaign(supabase, campaignId);
  if (slug) revalidatePath(`/dashboard/calendars/${slug}/emails/${campaignId}`);
  return { ok: true, enqueued: r.enqueued, skipped: r.skipped };
}
