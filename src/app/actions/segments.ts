"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { resolveSegment, SEGMENT_KINDS, type SegmentKind } from "@/lib/email/segments";

const kindEnum = z.enum(SEGMENT_KINDS.map((k) => k.kind) as [SegmentKind, ...SegmentKind[]]);

const segmentSchema = z.object({
  name: z.string().min(1).max(120),
  kind: kindEnum,
  event_id: z.string().uuid().optional().or(z.literal("")),
});

export type SegmentActionState = { ok?: boolean; error?: string } | undefined;
export type SegmentPreview = {
  ok: boolean;
  count: number;
  sample: { email: string; name: string | null }[];
  error?: string;
};

async function slugForSegment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  segmentId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("segments")
    .select("calendar:calendars(slug)")
    .eq("id", segmentId)
    .maybeSingle();
  return (data?.calendar as { slug: string } | null)?.slug ?? null;
}

/** Crea un segmento y redirige a la lista de segmentos. */
export async function createSegment(
  calendarSlug: string,
  _state: SegmentActionState,
  formData: FormData,
): Promise<SegmentActionState> {
  const parsed = segmentSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    event_id: formData.get("event_id"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const d = parsed.data;
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

  const needsEvent = SEGMENT_KINDS.find((k) => k.kind === d.kind)?.needsEvent;
  if (needsEvent && !d.event_id) return { error: "Ese segmento necesita un evento." };

  const { error } = await supabase.from("segments").insert({
    calendar_id: cal.id,
    name: d.name,
    kind: d.kind,
    config: d.event_id ? { event_id: d.event_id } : {},
    created_by: user.id,
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/calendars/${calendarSlug}/segments`);
  redirect(`/dashboard/calendars/${calendarSlug}/segments`);
}

export async function deleteSegment(segmentId: string): Promise<SegmentActionState> {
  const supabase = await createClient();
  const slug = await slugForSegment(supabase, segmentId);
  const { error } = await supabase.from("segments").delete().eq("id", segmentId);
  if (error) return { error: error.message };
  if (slug) revalidatePath(`/dashboard/calendars/${slug}/segments`);
  return { ok: true };
}

/**
 * Previsualiza un segmento (conteo + muestra de 5) sin guardarlo. Verifica
 * propiedad del calendario antes de resolver con el admin client.
 */
export async function previewSegment(
  calendarSlug: string,
  kind: string,
  eventId?: string,
): Promise<SegmentPreview> {
  if (!kindEnum.safeParse(kind).success) {
    return { ok: false, count: 0, sample: [], error: "Tipo de segmento inválido." };
  }
  const supabase = await createClient();
  const { data: cal } = await supabase
    .from("calendars")
    .select("id")
    .eq("slug", calendarSlug)
    .maybeSingle();
  if (!cal) return { ok: false, count: 0, sample: [], error: "Comunidad no encontrada." };

  const recipients = await resolveSegment(cal.id, kind as SegmentKind, eventId ? { event_id: eventId } : {});
  const withEmail = recipients.filter((r) => r.email);
  return {
    ok: true,
    count: withEmail.length,
    sample: withEmail.slice(0, 5),
  };
}
