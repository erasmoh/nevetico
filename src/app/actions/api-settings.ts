"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  generateApiKey,
  hashApiKey,
  fireWebhooks,
  type WebhookEvent,
} from "@/lib/webhooks";
import { z } from "zod";

// --- API keys ---

export type ApiKeyResult = { ok?: boolean; error?: string; key?: string } | undefined;

export async function createApiKey(
  calendarSlug: string,
  name: string,
): Promise<ApiKeyResult> {
  const supabase = await createClient();
  const { data: cal } = await supabase
    .from("calendars")
    .select("id")
    .eq("slug", calendarSlug)
    .maybeSingle();
  if (!cal) return { error: "Comunidad no encontrada." };

  const raw = generateApiKey();
  const { error } = await supabase.from("api_keys").insert({
    calendar_id: cal.id,
    name: name.slice(0, 80),
    key_hash: hashApiKey(raw),
    key_prefix: raw.slice(0, 12),
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/calendars/${calendarSlug}/api`);
  return { ok: true, key: raw };
}

export async function revokeApiKey(
  calendarSlug: string,
  keyId: string,
): Promise<ApiKeyResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/calendars/${calendarSlug}/api`);
  return { ok: true };
}

// --- Webhooks ---

const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).default([]),
});

export type WebhookResult = { ok?: boolean; error?: string } | undefined;

const ALL_EVENTS: WebhookEvent[] = [
  "registration.created",
  "event.published",
  "event.completed",
  "checkin.created",
  "campaign.sent",
];

export const WEBHOOK_EVENTS = ALL_EVENTS.map((e) => ({
  id: e,
  label: e,
}));

export async function createWebhook(
  calendarSlug: string,
  url: string,
  events: string[],
): Promise<WebhookResult> {
  const parsed = webhookSchema.safeParse({ url, events });
  if (!parsed.success) return { error: "URL inválida." };

  const supabase = await createClient();
  const { data: cal } = await supabase
    .from("calendars")
    .select("id")
    .eq("slug", calendarSlug)
    .maybeSingle();
  if (!cal) return { error: "Comunidad no encontrada." };

  const { error } = await supabase.from("webhooks").insert({
    calendar_id: cal.id,
    url: parsed.data.url,
    events: parsed.data.events,
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/calendars/${calendarSlug}/api`);
  return { ok: true };
}

export async function deleteWebhook(
  calendarSlug: string,
  webhookId: string,
): Promise<WebhookResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("webhooks").delete().eq("id", webhookId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/calendars/${calendarSlug}/api`);
  return { ok: true };
}

/** Hook para disparar webhooks desde otras actions. */
export async function triggerWebhooks(
  calendarId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await fireWebhooks(calendarId, event, payload);
  } catch (err) {
    console.error("[webhooks] fire failed:", err);
  }
}
