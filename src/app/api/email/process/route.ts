import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signToken } from "@/lib/email/tracking";
import { renderEmailHtml, renderEmailText, type EmailBlock } from "@/lib/email/render";
import { buildEmailVars, type EmailVars } from "@/lib/email/variables";
import { formatEventDate } from "@/lib/datetime";
import type { Json } from "@/lib/database.types";

// Procesa la cola de emails. Protegida por CRON_SECRET.
// - Sin RESEND_API_KEY: marca como 'sent' (stub de desarrollo).
// - Con RESEND_API_KEY: envía de verdad con Resend.
// Maneja plantillas transaccionales (cuerpo en texto) y campañas/automatizaciones
// (cuerpo HTML renderizado desde bloques del page builder, con tracking).
// Respeta bajas granulares por calendario (email_unsubscribes).

type Admin = ReturnType<typeof createAdminClient>;

type QueueRow = {
  id: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  payload: Json;
  context: Json;
  attempts: number;
  template: string;
  event_id: string | null;
  campaign_id: string | null;
  automation_id: string | null;
  calendar_id: string | null;
};

const FROM_NAME = "Nevetico";
const DEFAULT_FROM =
  process.env.EMAIL_FROM ?? "Nevetico <no-reply@nevetico.local>";

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
  }
  const provided = req.headers.get("x-cron-secret");
  const url = new URL(req.url);
  if (provided !== secret && url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const resendKey = process.env.RESEND_API_KEY;

  const { data: pending } = await admin
    .from("email_queue")
    .select(
      "id, to_email, to_name, subject, payload, context, attempts, template, event_id, campaign_id, automation_id, calendar_id",
    )
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(50);

  const emails = (pending ?? []) as QueueRow[];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Caches por request: las campañas/automatizaciones se cargan una sola vez.
  const campaignCache = new Map<string, CampaignData | null>();
  const automationCache = new Map<string, AutomationData | null>();
  const fromCache = new Map<string, string>();
  const unsubCache = new Set<string>();
  const eventCache = new Map<string, EventData | null>();

  for (const e of emails) {
    const calendarId = e.calendar_id;
    const unsubKey = `${calendarId ?? ""}|${e.to_email.toLowerCase()}`;
    if (calendarId && unsubCache.has(unsubKey)) {
      await markSkipped(admin, e.id);
      skipped++;
      continue;
    }
    if (calendarId && (await isUnsubscribed(admin, calendarId, e.to_email, unsubCache))) {
      unsubCache.add(unsubKey);
      await markSkipped(admin, e.id);
      skipped++;
      continue;
    }

    const from = await fromAddressForCalendar(admin, calendarId, fromCache);

    try {
      const { subject, html, text } = await buildContent(admin, e, {
        campaignCache,
        automationCache,
        eventCache,
      });

      if (resendKey) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [e.to_email],
            subject,
            html: html ?? undefined,
            text: text ?? undefined,
          }),
        });
        if (res.ok) {
          const body = await res.json().catch(() => null);
          const messageId = body?.id ?? null;
          await markSent(admin, e.id, messageId);
          await recordEvent(admin, {
            queueId: e.id,
            campaignId: e.campaign_id,
            calendarId,
            type: "sent",
          });
          sent++;
        } else {
          const err = await res.text().catch(() => `resend ${res.status}`);
          await markFailed(admin, e.id, err.slice(0, 500));
          failed++;
        }
      } else {
        console.log(`[email][stub] to=${e.to_email} subject="${subject}"`);
        await markSent(admin, e.id, null);
        await recordEvent(admin, {
          queueId: e.id,
          campaignId: e.campaign_id,
          calendarId,
          type: "sent",
        });
        sent++;
      }
    } catch (err) {
      await markFailed(admin, e.id, String(err).slice(0, 500));
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, skipped, total: emails.length });
}

// --- Construcción del contenido por plantilla ---

type CampaignData = {
  subject: string;
  preheader: string | null;
  blocks: EmailBlock[];
  calendarId: string;
  eventId: string | null;
};
type AutomationData = {
  steps: Array<{ type: string; subject?: string; blocks?: EmailBlock[] }>;
  calendarId: string;
};
type EventData = {
  title: string;
  slug: string;
  startsAt: string;
  timezone: string;
  venueName: string | null;
  address: string | null;
  calendarSlug: string | null;
};

async function buildContent(
  admin: Admin,
  e: QueueRow,
  cache: {
    campaignCache: Map<string, CampaignData | null>;
    automationCache: Map<string, AutomationData | null>;
    eventCache: Map<string, EventData | null>;
  },
): Promise<{ subject: string; html: string | null; text: string | null }> {
  if (e.template === "campaign" && e.campaign_id) {
    const campaign = await loadCampaign(admin, e.campaign_id, cache.campaignCache);
    if (!campaign) return transactional(e);
    const ev = e.event_id ? await loadEvent(admin, e.event_id, cache.eventCache) : null;
    const vars = composeVars(e, campaign.calendarId, campaign.eventId, ev);
    const { html, text } = renderTracked(campaign.blocks, vars, e.id);
    return { subject: interpolate(campaign.subject, vars), html, text };
  }

  if (e.template === "automation" && e.automation_id) {
    const automation = await loadAutomation(admin, e.automation_id, cache.automationCache);
    if (!automation) return transactional(e);
    const ctx = (e.context ?? {}) as Record<string, unknown>;
    const stepIndex = typeof ctx.step_index === "number" ? ctx.step_index : 0;
    const step = automation.steps[stepIndex];
    if (!step || step.type !== "send_email" || !step.blocks) return transactional(e);
    const ev = e.event_id ? await loadEvent(admin, e.event_id, cache.eventCache) : null;
    const vars = composeVars(e, automation.calendarId, e.event_id, ev);
    const { html, text } = renderTracked(step.blocks, vars, e.id);
    const subject = step.subject ? interpolate(step.subject, vars) : e.subject;
    return { subject, html, text };
  }

  return transactional(e);
}

/** Plantilla transaccional: cuerpo en texto plano (legacy). */
function transactional(e: QueueRow): { subject: string; html: null; text: string } {
  return {
    subject: e.subject,
    html: null,
    text: renderText(e.template, e.subject, e.payload as Record<string, unknown> | null),
  };
}

function composeVars(
  e: QueueRow,
  calendarId: string | null,
  eventId: string | null,
  ev: EventData | null,
): EmailVars {
  const ctx = (e.context ?? {}) as Record<string, unknown>;
  const base = buildEmailVars({
    recipientEmail: e.to_email,
    recipientName: e.to_name,
    calendarName: typeof ctx.calendar_name === "string" ? ctx.calendar_name : null,
    calendarSlug: ev?.calendarSlug ?? null,
    event: ev
      ? {
          title: ev.title,
          slug: ev.slug,
          startsAt: ev.startsAt,
          timezone: ev.timezone,
          venueName: ev.venueName,
          address: ev.address,
        }
      : null,
    siteUrl: siteUrl(),
  });
  // tracking URLs (dependen del queue id).
  const token = signToken(e.id);
  base.unsubscribe_url = `${siteUrl()}/email/unsubscribe?t=${token}`;
  return base;
}

function renderTracked(
  blocks: EmailBlock[],
  vars: EmailVars,
  queueId: string,
): { html: string; text: string } {
  const token = signToken(queueId);
  const base = siteUrl();
  const wrapLink = (u: string) =>
    `${base}/api/email/track/click?t=${token}&u=${encodeURIComponent(u)}`;
  const openPixelUrl = `${base}/api/email/track/open?t=${token}`;
  const html = renderEmailHtml(blocks, {
    vars,
    wrapLink,
    openPixelUrl,
    subject: vars.event_title ?? undefined,
  });
  const text = renderEmailText(blocks, { vars });
  return { html, text };
}

function interpolate(input: string, vars: EmailVars): string {
  return input.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] ?? "") as string);
}

// --- Carga (memoizada) ---

async function loadCampaign(
  admin: Admin,
  id: string,
  cache: Map<string, CampaignData | null>,
): Promise<CampaignData | null> {
  if (cache.has(id)) return cache.get(id) ?? null;
  const { data } = await admin
    .from("email_campaigns")
    .select("id, subject, preheader, blocks, calendar_id, event_id")
    .eq("id", id)
    .maybeSingle();
  const c = data as
    | {
        subject: string;
        preheader: string | null;
        blocks: Json;
        calendar_id: string;
        event_id: string | null;
      }
    | null;
  const result: CampaignData | null = c
    ? {
        subject: c.subject,
        preheader: c.preheader,
        blocks: (Array.isArray(c.blocks) ? c.blocks : []) as EmailBlock[],
        calendarId: c.calendar_id,
        eventId: c.event_id,
      }
    : null;
  cache.set(id, result);
  return result;
}

async function loadAutomation(
  admin: Admin,
  id: string,
  cache: Map<string, AutomationData | null>,
): Promise<AutomationData | null> {
  if (cache.has(id)) return cache.get(id) ?? null;
  const { data } = await admin
    .from("automations")
    .select("id, steps, calendar_id")
    .eq("id", id)
    .maybeSingle();
  const a = data as { steps: Json; calendar_id: string } | null;
  const result: AutomationData | null = a
    ? {
        steps: (Array.isArray(a.steps) ? a.steps : []) as AutomationData["steps"],
        calendarId: a.calendar_id,
      }
    : null;
  cache.set(id, result);
  return result;
}

async function loadEvent(
  admin: Admin,
  id: string,
  cache: Map<string, EventData | null>,
): Promise<EventData | null> {
  if (cache.has(id)) return cache.get(id) ?? null;
  const { data } = await admin
    .from("events")
    .select("id, slug, title, starts_at, timezone, venue_name, address, calendar:calendars(slug)")
    .eq("id", id)
    .maybeSingle();
  const ev = data as
    | {
        slug: string;
        title: string;
        starts_at: string;
        timezone: string;
        venue_name: string | null;
        address: string | null;
        calendar: { slug: string } | null;
      }
    | null;
  const result: EventData | null = ev
    ? {
        title: ev.title,
        slug: ev.slug,
        startsAt: ev.starts_at,
        timezone: ev.timezone,
        venueName: ev.venue_name,
        address: ev.address,
        calendarSlug: ev.calendar?.slug ?? null,
      }
    : null;
  cache.set(id, result);
  return result;
}

async function fromAddressForCalendar(
  admin: Admin,
  calendarId: string | null,
  cache: Map<string, string>,
): Promise<string> {
  if (!calendarId) return DEFAULT_FROM;
  if (cache.has(calendarId)) return cache.get(calendarId)!;
  const { data } = await admin
    .from("verified_domains")
    .select("domain")
    .eq("calendar_id", calendarId)
    .eq("status", "verified")
    .limit(1)
    .maybeSingle();
  const from = data?.domain
    ? `${FROM_NAME} <no-reply@${data.domain}>`
    : DEFAULT_FROM;
  cache.set(calendarId, from);
  return from;
}

async function isUnsubscribed(
  admin: Admin,
  calendarId: string,
  email: string,
  cache: Set<string>,
): Promise<boolean> {
  const key = `${calendarId}|${email.toLowerCase()}`;
  if (cache.has(key)) return true;
  const { count } = await admin
    .from("email_unsubscribes")
    .select("id", { count: "exact", head: true })
    .eq("calendar_id", calendarId)
    .eq("email", email.toLowerCase());
  return (count ?? 0) > 0;
}

// --- Mutaciones ---

async function markSent(admin: Admin, id: string, messageId: string | null) {
  await admin
    .from("email_queue")
    .update({ status: "sent", sent_at: new Date().toISOString(), message_id: messageId })
    .eq("id", id);
}

async function markSkipped(admin: Admin, id: string) {
  await admin.from("email_queue").update({ status: "skipped" }).eq("id", id);
}

async function markFailed(admin: Admin, id: string, error: string) {
  const { data } = await admin
    .from("email_queue")
    .select("attempts")
    .eq("id", id)
    .maybeSingle();
  const attempts = (data?.attempts ?? 0) + 1;
  await admin
    .from("email_queue")
    .update({ status: "failed", last_error: error, attempts })
    .eq("id", id);
}

async function recordEvent(
  admin: Admin,
  args: {
    queueId: string;
    campaignId: string | null;
    calendarId: string | null;
    type: string;
  },
) {
  await admin.from("email_events").insert({
    queue_id: args.queueId,
    campaign_id: args.campaignId,
    calendar_id: args.calendarId,
    event_type: args.type,
  });
}

function renderText(
  template: string,
  subject: string,
  payload: Record<string, unknown> | null,
): string {
  const p = payload ?? {};
  const title = typeof p.event_title === "string" ? p.event_title : "";
  const startsAt = typeof p.starts_at === "string" ? p.starts_at : "";
  const status = typeof p.status === "string" ? p.status : "";
  const calendarName =
    typeof p.calendar_name === "string" ? p.calendar_name : "";
  const quantity = typeof p.quantity === "number" ? p.quantity : 1;
  const orderId = typeof p.order_id === "string" ? p.order_id : "";

  if (template === "ticket_confirmation") {
    return [
      `Tu entrada: ${title}`,
      quantity > 1 ? `Entradas: ${quantity}` : "",
      orderId ? `Order: ${orderId.slice(0, 8)}` : "",
      "",
      "Muestra este correo (o tu QR) en la entrada del evento.",
      "Gracias por tu compra.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (template === "refund") {
    return [
      "Reembolso procesado",
      orderId ? `Order: ${orderId.slice(0, 8)}` : "",
      "",
      "Tu pago ha sido reembolsado. Puede tardar 5-10 días hábiles en aparecer en tu cuenta.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (status === "waitlist") {
    return `Te añadimos a la lista de espera para "${title}". Te avisaremos si hay lugar.`;
  }
  return [
    `Confirmado: ${title}`,
    calendarName ? `Comunidad: ${calendarName}` : "",
    startsAt ? `Cuándo: ${formatEventDate(startsAt, "UTC")}` : "",
    "",
    "Gracias por registrarte.",
  ]
    .filter(Boolean)
    .join("\n");
}
