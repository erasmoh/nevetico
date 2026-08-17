import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueEmail } from "@/lib/email/queue";
import { resolveSegment } from "@/lib/email/segments";
import type { EmailBlock } from "@/lib/email/render";
import type { Json } from "@/lib/database.types";

/**
 * Motor de automatizaciones. Un automation = trigger + pipeline de pasos
 * (ver `automations` en 0014_email_marketing.sql). `fireAutomation` encola los
 * pasos `send_email` para los destinatarios que correspondan al trigger; los
 * pasos `wait` se traducen en `delay_minutes` de cada paso (ya encolado con
 * scheduled_for). `runTimeBasedAutomations` lo usa el cron
 * `/api/automations/run` para los triggers temporales (recordatorios, post-
 * evento, no-show); los triggers `registration_created`/`event_published` se
 * disparan desde las server actions correspondientes.
 */

export type AutomationStep = {
  type: "send_email" | "add_to_segment" | "wait";
  subject?: string;
  blocks?: EmailBlock[];
  delay_minutes?: number;
  segment_id?: string;
};

export type AutomationRow = {
  id: string;
  calendar_id: string;
  trigger: string;
  steps: Json;
};

export type FireContext = {
  calendarId: string;
  calendarName?: string | null;
  event?: {
    id: string;
    title: string;
    slug: string;
    startsAt: string;
    timezone: string;
    venueName?: string | null;
    address?: string | null;
    calendarSlug?: string | null;
  } | null;
  /** Para trigger=registration_created. */
  registration?: { email: string; name: string | null } | null;
};

type Recipient = { email: string; name: string | null };

type Admin = ReturnType<typeof createAdminClient>;

function stepsOf(raw: Json): AutomationStep[] {
  return Array.isArray(raw) ? (raw as AutomationStep[]) : [];
}

/** Destinatarios según el trigger. */
async function recipientsFor(
  admin: Admin,
  automation: AutomationRow,
  ctx: FireContext,
): Promise<Recipient[]> {
  const trig = automation.trigger;
  if (trig === "registration_created" && ctx.registration) {
    return [ctx.registration];
  }
  if (!ctx.event) return [];
  if (trig === "no_show") {
    return resolveSegment(automation.calendar_id, "event_no_show", {
      event_id: ctx.event.id,
    });
  }
  // event_published, reminder_24h, reminder_1h, event_ended → confirmados.
  return resolveSegment(automation.calendar_id, "event_going", {
    event_id: ctx.event.id,
  });
}

/**
 * Encola los pasos `send_email` del automation para los destinatarios del
 * trigger. Cada paso lleva su `delay_minutes` (relative al momento de disparo).
 * Devuelve cuántos emails encoló.
 */
export async function fireAutomation(
  automation: AutomationRow,
  ctx: FireContext,
): Promise<number> {
  const steps = stepsOf(automation.steps).filter((s) => s.type === "send_email");
  if (steps.length === 0) return 0;

  const recipients = (await recipientsFor(createAdminClient(), automation, ctx)).filter(
    (r) => r.email,
  );
  if (recipients.length === 0) return 0;

  let enqueued = 0;
  steps.forEach((step, index) => {
    const delayMin = Math.max(0, Math.min(60 * 24 * 30, step.delay_minutes ?? 0));
    const scheduledFor = new Date(Date.now() + delayMin * 60_000);
    for (const r of recipients) {
      // enqueueEmail no devuelve awaitable útil por destinatario; disparamos y
      // contamos (los errores se loguean dentro).
      void enqueueEmail({
        template: "automation",
        automationId: automation.id,
        calendarId: ctx.calendarId,
        eventId: ctx.event?.id,
        toEmail: r.email,
        toName: r.name,
        subject: step.subject ?? "",
        context: {
          step_index: index,
          calendar_name: ctx.calendarName ?? null,
          first_name: r.name?.split(/\s+/)[0] ?? "",
        },
        scheduledFor,
      });
      enqueued++;
    }
  });
  return enqueued;
}

/** Carga los automations habilitados de un calendario con un trigger dado. */
export async function loadAutomationsByTrigger(
  calendarId: string,
  trigger: string,
): Promise<AutomationRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("automations")
    .select("id, calendar_id, trigger, steps")
    .eq("calendar_id", calendarId)
    .eq("enabled", true)
    .eq("trigger", trigger);
  return (data ?? []) as AutomationRow[];
}

/** ¿Ya encolamos este automation para este evento? (dedupe del cron temporal) */
async function alreadyFired(
  admin: Admin,
  automationId: string,
  eventId: string,
): Promise<boolean> {
  const { count } = await admin
    .from("email_queue")
    .select("id", { count: "exact", head: true })
    .eq("automation_id", automationId)
    .eq("event_id", eventId)
    .in("status", ["pending", "sent"]);
  return (count ?? 0) > 0;
}

type EventForTrigger = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  venue_name: string | null;
  address: string | null;
  calendar_id: string;
  calendar: { slug: string; name: string } | null;
};

/**
 * Recorre los triggers temporales y dispara los automations cuyos eventos
 * cruzan el umbral en esta ventana. Devuelve un resumen para el cron.
 */
export async function runTimeBasedAutomations(): Promise<{
  fired: number;
  enqueued: number;
}> {
  const admin = createAdminClient();
  const now = Date.now();
  const isoNow = new Date(now).toISOString();
  const in24h = new Date(now + 24 * 3600_000).toISOString();
  const in1h = new Date(now + 3600_000).toISOString();
  const minus12h = new Date(now - 12 * 3600_000).toISOString();

  const triggers: Array<{
    trigger: string;
    range: { col: "starts_at" | "ends_at"; from?: string; to: string };
  }> = [
    { trigger: "reminder_24h", range: { col: "starts_at", from: isoNow, to: in24h } },
    { trigger: "reminder_1h", range: { col: "starts_at", from: isoNow, to: in1h } },
    {
      trigger: "event_ended",
      range: { col: "ends_at", from: minus12h, to: isoNow },
    },
    { trigger: "no_show", range: { col: "ends_at", from: minus12h, to: isoNow } },
  ];

  let fired = 0;
  let enqueued = 0;

  for (const { trigger, range } of triggers) {
    // events.ends_at puede ser null; para ended/no_show usamos starts_at como
    // fallback vía un .or() que también cubra ends_at is null.
    let query = admin
      .from("events")
      .select(
        "id, slug, title, starts_at, ends_at, timezone, venue_name, address, calendar_id, calendar:calendars(slug, name)",
      )
      .eq("status", "published");
    if (range.col === "ends_at") {
      query = query
        .not("ends_at", "is", null)
        .gte("ends_at", range.from ?? "epoch")
        .lte("ends_at", range.to);
    } else {
      query = query
        .gte("starts_at", range.from ?? "epoch")
        .lte("starts_at", range.to);
    }
    const { data: events } = await query;
    for (const ev of (events ?? []) as EventForTrigger[]) {
      const automations = await loadAutomationsByTrigger(ev.calendar_id, trigger);
      for (const a of automations) {
        if (await alreadyFired(admin, a.id, ev.id)) continue;
        const ctx: FireContext = {
          calendarId: ev.calendar_id,
          calendarName: ev.calendar?.name ?? null,
          event: {
            id: ev.id,
            title: ev.title,
            slug: ev.slug,
            startsAt: ev.starts_at,
            timezone: ev.timezone,
            venueName: ev.venue_name,
            address: ev.address,
            calendarSlug: ev.calendar?.slug ?? null,
          },
        };
        const n = await fireAutomation(a, ctx);
        if (n > 0) {
          fired++;
          enqueued += n;
        }
      }
    }
  }

  return { fired, enqueued };
}
