import "server-only";
import { formatEventDate } from "@/lib/datetime";

/**
 * Construye el map de variables para interpolar en el cuerpo de un email
 * ({first_name}, {event_title}, {calendar_name}, {rsvp_url}…). Las URLs de
 * tracking (open/click/unsubscribe) dependen del `queue_id` y se añaden en el
 * worker al renderizar, no aquí.
 */

export type EmailVars = Record<string, string | undefined>;

export type VarsContext = {
  recipientEmail: string;
  recipientName?: string | null;
  calendarName?: string | null;
  calendarSlug?: string | null;
  event?: {
    title: string;
    slug: string;
    startsAt: string;
    timezone: string;
    venueName?: string | null;
    address?: string | null;
  } | null;
  /** URL base del sitio (ej. http://localhost:3000). */
  siteUrl: string;
};

function firstName(name?: string | null): string {
  if (!name) return "";
  return name.trim().split(/\s+/)[0] ?? name;
}

export function buildEmailVars(ctx: VarsContext): EmailVars {
  const ev = ctx.event;
  const eventUrl = ev
    ? ctx.calendarSlug
      ? `${ctx.siteUrl}/c/${ctx.calendarSlug}/${ev.slug}`
      : `${ctx.siteUrl}/e/${ev.slug}`
    : undefined;

  return {
    first_name: firstName(ctx.recipientName),
    name: ctx.recipientName ?? "",
    email: ctx.recipientEmail,
    calendar_name: ctx.calendarName ?? "Nevetico",
    event_title: ev?.title ?? "",
    event_date: ev ? formatEventDate(ev.startsAt, ev.timezone) : "",
    event_venue: ev?.venueName ?? "",
    event_address: ev?.address ?? "",
    rsvp_url: eventUrl,
  };
}
