import "server-only";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/datetime";

/**
 * Carga los datos de un evento para generar imágenes OG / Stories.
 * Centraliza la query para no duplicarla en opengraph-image.tsx y en la
 * route de Stories.
 */
export type OgEventData = {
  title: string;
  description: string | null;
  startsAt: string;
  timezone: string;
  venueName: string | null;
  address: string | null;
  coverUrl: string | null;
  calendarName: string | null;
  calendarSlug: string | null;
  eventSlug: string | null;
};

export async function loadEventForOg(eventId: string): Promise<OgEventData | null> {
  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("events")
    .select(
      "title, description, starts_at, timezone, venue_name, address, cover_url, slug, calendar:calendars(slug, name)",
    )
    .eq("id", eventId)
    .maybeSingle();
  if (!ev) return null;
  const cal = ev.calendar as { slug: string; name: string } | null;
  return {
    title: ev.title,
    description: ev.description,
    startsAt: ev.starts_at,
    timezone: ev.timezone,
    venueName: ev.venue_name,
    address: ev.address,
    coverUrl: ev.cover_url,
    calendarName: cal?.name ?? null,
    calendarSlug: cal?.slug ?? null,
    eventSlug: ev.slug ?? null,
  };
}

/** URL pública canónica de un evento (para og:url y share). */
export function eventPublicUrl(ev: OgEventData, siteUrl: string): string {
  if (ev.calendarSlug && ev.eventSlug) {
    return `${siteUrl}/c/${ev.calendarSlug}/${ev.eventSlug}`;
  }
  // Para eventos personales necesitamos el id; lo pasamos aparte.
  return siteUrl;
}

/** Descarga una imagen y la devuelve como data URL base64 para <img> en OG. */
export async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const type = res.headers.get("content-type") ?? "image/jpeg";
    const base64 = Buffer.from(buf).toString("base64");
    return `data:${type};base64,${base64}`;
  } catch {
    return null;
  }
}

/** Color de marca Nevetico (violeta) para las imágenes OG. */
export const BRAND_GRADIENT = "linear-gradient(135deg, #7c3aed, #4f46e5)";
export const BRAND_COLOR = "#7c3aed";
