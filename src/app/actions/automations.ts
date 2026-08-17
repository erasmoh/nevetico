"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { BLOCK_DEFS } from "@/lib/blocks";
import { AUTOMATION_TRIGGERS, type StepType } from "@/lib/email/automation-types";
import type { Json } from "@/lib/database.types";

const blockTypes = new Set(BLOCK_DEFS.map((b) => b.type));
const triggerIds = AUTOMATION_TRIGGERS.map((t) => t.id) as [string, ...string[]];

const stepSchema = z.object({
  type: z.enum(["send_email", "add_to_segment", "wait"]),
  subject: z.string().max(200).optional(),
  blocks: z
    .array(z.object({ type: z.string(), config: z.record(z.string(), z.unknown()) }))
    .max(50)
    .optional(),
  delay_minutes: z.number().int().min(0).max(60 * 24 * 30).optional(),
  segment_id: z.string().uuid().optional(),
}).superRefine((step, ctx) => {
  if (step.type === "send_email") {
    if (!step.subject || step.subject.trim() === "") {
      ctx.addIssue({ code: "custom", path: ["subject"], message: "El email necesita asunto." });
    }
    if (!step.blocks || step.blocks.length === 0) {
      ctx.addIssue({ code: "custom", path: ["blocks"], message: "Agrega al menos un bloque." });
    }
  }
  if (step.blocks) {
    for (const b of step.blocks) {
      if (!blockTypes.has(b.type)) {
        ctx.addIssue({ code: "custom", path: ["blocks"], message: `Bloque inválido: ${b.type}` });
      }
    }
  }
});

const updateSchema = z.object({
  name: z.string().min(1).max(120),
  trigger: z.enum(triggerIds),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()),
  steps: z.array(stepSchema).max(10),
});

export type AutomationActionState = { ok?: boolean; error?: string } | undefined;

async function slugForAutomation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  automationId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("automations")
    .select("calendar:calendars(slug)")
    .eq("id", automationId)
    .maybeSingle();
  return (data?.calendar as { slug: string } | null)?.slug ?? null;
}

/** Crea una automatización vacía y redirige al editor. */
export async function createAutomation(
  calendarSlug: string,
  _state: AutomationActionState,
  formData: FormData,
): Promise<AutomationActionState> {
  const name = (formData.get("name") as string | null)?.trim() || "Nueva automatización";
  const trigger = formData.get("trigger") as string | null;
  if (!trigger || !AUTOMATION_TRIGGERS.some((t) => t.id === trigger)) {
    return { error: "Elige un disparador." };
  }
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
  if (!cal) return { error: "Comunidad no encontrada." };

  const { data, error } = await supabase
    .from("automations")
    .insert({
      calendar_id: cal.id,
      name,
      trigger,
      enabled: true,
      config: {},
      steps: [],
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  redirect(`/dashboard/calendars/${calendarSlug}/automations/${data.id}`);
}

export async function updateAutomation(
  automationId: string,
  raw: {
    name: string;
    trigger: string;
    enabled: boolean;
    config: Record<string, unknown>;
    steps: unknown[];
  },
): Promise<AutomationActionState> {
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("automations")
    .update({
      name: d.name,
      trigger: d.trigger,
      enabled: d.enabled,
      config: d.config as Json,
      steps: d.steps as unknown as Json,
    })
    .eq("id", automationId);
  if (error) return { error: error.message };

  const slug = await slugForAutomation(supabase, automationId);
  if (slug) revalidatePath(`/dashboard/calendars/${slug}/automations/${automationId}`);
  return { ok: true };
}

export async function toggleAutomation(
  automationId: string,
  enabled: boolean,
): Promise<AutomationActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("automations")
    .update({ enabled })
    .eq("id", automationId);
  if (error) return { error: error.message };
  const slug = await slugForAutomation(supabase, automationId);
  if (slug) revalidatePath(`/dashboard/calendars/${slug}/automations`);
  return { ok: true };
}

export async function deleteAutomation(
  automationId: string,
): Promise<AutomationActionState> {
  const supabase = await createClient();
  const slug = await slugForAutomation(supabase, automationId);
  const { error } = await supabase.from("automations").delete().eq("id", automationId);
  if (error) return { error: error.message };
  if (slug) revalidatePath(`/dashboard/calendars/${slug}/automations`);
  return { ok: true };
}

export type { StepType };
