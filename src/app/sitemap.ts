import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

/**
 * sitemap.xml dinámico. Incluye:
 *  - Página principal + /explore
 *  - Todos los calendarios (/c/[slug])
 *  - Todos los eventos publicados (/c/[slug]/[eventSlug] o /e/[id])
 *
 * Los eventos se consultan con el cliente server (RLS permite leer
 * published). Limitamos a 500 eventos para no explotar.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const supabase = await createClient();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/explore`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];

  // Calendarios.
  const { data: calendars } = await supabase
    .from("calendars")
    .select("slug, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  const calendarEntries: MetadataRoute.Sitemap = (calendars ?? []).map((c) => ({
    url: `${siteUrl}/c/${c.slug}`,
    lastModified: new Date(c.updated_at),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Eventos publicados.
  const { data: events } = await supabase
    .from("events")
    .select("id, slug, starts_at, updated_at, calendar:calendars(slug)")
    .eq("status", "published")
    .order("starts_at", { ascending: false })
    .limit(500);

  const eventEntries: MetadataRoute.Sitemap = (events ?? []).map((e) => {
    const cal = e.calendar as { slug: string } | null;
    const url = cal?.slug
      ? `${siteUrl}/c/${cal.slug}/${e.slug}`
      : `${siteUrl}/e/${e.id}`;
    return {
      url,
      lastModified: new Date(e.updated_at),
      changeFrequency: "weekly",
      priority: 0.7,
    };
  });

  return [...staticEntries, ...calendarEntries, ...eventEntries];
}
