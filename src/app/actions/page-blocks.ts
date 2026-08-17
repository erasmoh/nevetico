"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { blockDef } from "@/lib/blocks";
import { templateById } from "@/lib/templates";
import { DEFAULT_THEME, THEME_FONTS, THEME_PRESETS, type PageTheme } from "@/lib/theme";
import type { Json } from "@/lib/database.types";

export type BlockActionState = { error?: string; ok?: boolean } | undefined;

/** Revalida la página del builder y las públicas del evento. */
async function revalidateEvent(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("slug, calendar:calendars(slug)")
    .eq("id", eventId)
    .maybeSingle();
  revalidatePath(`/dashboard/events/${eventId}/design`);
  revalidatePath(`/e/${eventId}`);
  const calendarSlug = (data?.calendar as { slug: string } | null)?.slug;
  if (calendarSlug && data?.slug) {
    revalidatePath(`/c/${calendarSlug}/${data.slug}`);
  }
}

export async function addBlock(eventId: string, type: string): Promise<BlockActionState> {
  const def = blockDef(type);
  if (!def) return { error: "Tipo de bloque desconocido." };

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("page_blocks")
    .select("order_idx")
    .eq("event_id", eventId)
    .order("order_idx", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("page_blocks").insert({
    event_id: eventId,
    type,
    order_idx: (last?.order_idx ?? -1) + 1,
    config: def.defaults as Json,
  });
  if (error) return { error: error.message };

  await revalidateEvent(eventId);
  return { ok: true };
}

export async function deleteBlock(
  eventId: string,
  blockId: string,
): Promise<BlockActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("page_blocks")
    .delete()
    .eq("id", blockId)
    .eq("event_id", eventId);
  if (error) return { error: error.message };
  await revalidateEvent(eventId);
  return { ok: true };
}

export async function setBlockVisibility(
  eventId: string,
  blockId: string,
  visible: boolean,
): Promise<BlockActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("page_blocks")
    .update({ visible })
    .eq("id", blockId)
    .eq("event_id", eventId);
  if (error) return { error: error.message };
  await revalidateEvent(eventId);
  return { ok: true };
}

/** Mueve un bloque una posición arriba (-1) o abajo (+1). */
export async function moveBlock(
  eventId: string,
  blockId: string,
  direction: -1 | 1,
): Promise<BlockActionState> {
  const supabase = await createClient();
  const { data: blocks, error: readError } = await supabase
    .from("page_blocks")
    .select("id")
    .eq("event_id", eventId)
    .order("order_idx", { ascending: true });
  if (readError) return { error: readError.message };

  const ids = (blocks ?? []).map((b) => b.id);
  const from = ids.indexOf(blockId);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return { ok: true };
  [ids[from], ids[to]] = [ids[to], ids[from]];

  const { error } = await supabase.rpc("reorder_page_blocks", {
    p_event_id: eventId,
    p_ids: ids,
  });
  if (error) return { error: error.message };
  await revalidateEvent(eventId);
  return { ok: true };
}

/**
 * Guarda el config de un bloque. Los campos permitidos vienen del catálogo
 * (`BLOCK_DEFS`), así el cliente no puede meter claves arbitrarias.
 */
export async function updateBlockConfig(
  eventId: string,
  blockId: string,
  type: string,
  config: unknown,
): Promise<BlockActionState> {
  const def = blockDef(type);
  if (!def) return { error: "Tipo de bloque desconocido." };
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return { error: "Configuración inválida." };
  }

  const incoming = config as Record<string, unknown>;
  const allowed = new Set(def.fields.map((f) => f.name));
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (allowed.has(key)) clean[key] = value;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("page_blocks")
    .update({ config: clean as Json })
    .eq("id", blockId)
    .eq("event_id", eventId);
  if (error) return { error: error.message };

  await revalidateEvent(eventId);
  return { ok: true };
}

const themeSchema = z.object({
  preset: z.enum(THEME_PRESETS.map((p) => p.id) as [string, ...string[]]),
  font: z.enum(THEME_FONTS.map((f) => f.id) as [string, ...string[]]),
  radius: z.number().min(0).max(2),
  mode: z.enum(["auto", "light", "dark"]),
  primary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function updateEventTheme(
  eventId: string,
  theme: PageTheme,
): Promise<BlockActionState> {
  const parsed = themeSchema.safeParse(theme);
  if (!parsed.success) return { error: "Tema inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ theme: parsed.data as Json })
    .eq("id", eventId);
  if (error) return { error: error.message };

  await revalidateEvent(eventId);
  return { ok: true };
}

/** Aplica una plantilla: reemplaza los bloques y el tema del evento. */
export async function applyTemplate(
  eventId: string,
  templateId: string,
): Promise<BlockActionState> {
  const template = templateById(templateId);
  if (!template) return { error: "Plantilla desconocida." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("apply_event_template", {
    p_event_id: eventId,
    p_blocks: template.blocks as unknown as Json,
  });
  if (error) return { error: error.message };

  const { error: themeError } = await supabase
    .from("events")
    .update({ theme: { ...DEFAULT_THEME, ...template.theme } as Json })
    .eq("id", eventId);
  if (themeError) return { error: themeError.message };

  await revalidateEvent(eventId);
  return { ok: true };
}
