import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueEmail } from "@/lib/email/queue";
import { resolveSegment, type SegmentKind, type SegmentConfig } from "@/lib/email/segments";
import type { Json } from "@/lib/database.types";

/**
 * Encola los envíos de una campaña a los destinatarios de su segmento.
 * - Verifica estado (draft/scheduled) y que tenga segmento.
 * - Filtra bajas (email_unsubscribes) del calendario.
 * - Marca la campaña como 'sent' con recipient_count.
 * Lo usa la server action `sendCampaign` y el cron `/api/campaigns/process`
 * (para campañas programadas).
 */
export async function enqueueCampaignRecipients(
  campaignId: string,
): Promise<{ enqueued: number; skipped: number; error?: string }> {
  const admin = createAdminClient();

  const { data: campaign } = await admin
    .from("email_campaigns")
    .select("id, calendar_id, event_id, segment_id, subject, status")
    .eq("id", campaignId)
    .maybeSingle();
  const c = campaign as
    | {
        id: string;
        calendar_id: string;
        event_id: string | null;
        segment_id: string | null;
        subject: string;
        status: string;
      }
    | null;
  if (!c) return { enqueued: 0, skipped: 0, error: "Campaña no encontrada." };
  if (!["draft", "scheduled"].includes(c.status)) {
    return { enqueued: 0, skipped: 0, error: "La campaña ya fue enviada o cancelada." };
  }
  if (!c.segment_id) {
    return { enqueued: 0, skipped: 0, error: "La campaña no tiene segmento." };
  }

  const { data: seg } = await admin
    .from("segments")
    .select("kind, config")
    .eq("id", c.segment_id)
    .maybeSingle();
  const s = seg as { kind: string; config: Json } | null;
  if (!s) return { enqueued: 0, skipped: 0, error: "Segmento no encontrado." };

  const { data: cal } = await admin
    .from("calendars")
    .select("name")
    .eq("id", c.calendar_id)
    .maybeSingle();
  const calendarName = cal?.name ?? null;

  // Destinatarios del segmento.
  const recipients = (
    await resolveSegment(c.calendar_id, s.kind as SegmentKind, (s.config ?? {}) as SegmentConfig)
  ).filter((r) => r.email);

  // Bajas del calendario.
  const { data: unsubs } = await admin
    .from("email_unsubscribes")
    .select("email")
    .eq("calendar_id", c.calendar_id);
  const unsubSet = new Set((unsubs ?? []).map((u) => (u.email as string).toLowerCase()));

  // Marcamos sending para evitar doble envío si algo concurrency.
  await admin
    .from("email_campaigns")
    .update({ status: "sending" })
    .eq("id", c.id);

  let enqueued = 0;
  let skipped = 0;
  for (const r of recipients) {
    if (unsubSet.has(r.email.toLowerCase())) {
      skipped++;
      continue;
    }
    await enqueueEmail({
      template: "campaign",
      campaignId: c.id,
      calendarId: c.calendar_id,
      eventId: c.event_id ?? undefined,
      toEmail: r.email,
      toName: r.name,
      subject: c.subject,
      context: {
        calendar_name: calendarName,
        first_name: r.name?.split(/\s+/)[0] ?? "",
      },
    });
    enqueued++;
  }

  await admin
    .from("email_campaigns")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      recipient_count: enqueued,
    })
    .eq("id", c.id);

  return { enqueued, skipped };
}
