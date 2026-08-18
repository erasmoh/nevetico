import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EventPublicView } from "@/components/event/event-public-view";

export async function generateMetadata({
  params,
}: PageProps<"/c/[calendarSlug]/[eventSlug]">): Promise<Metadata> {
  const { calendarSlug, eventSlug } = await params;
  const supabase = await createClient();
  const { data: cal } = await supabase
    .from("calendars")
    .select("id, name")
    .eq("slug", calendarSlug)
    .maybeSingle();
  if (!cal) return { title: "Evento no encontrado" };
  const { data: ev } = await supabase
    .from("events")
    .select("title, description, starts_at, timezone, venue_name, status, cover_url")
    .eq("calendar_id", cal.id)
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev || ev.status !== "published")
    return { title: "Evento no encontrado" };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const url = `${siteUrl}/c/${calendarSlug}/${eventSlug}`;
  const description = ev.description ?? `Únete a ${ev.title} en Nevetico.`;

  return {
    title: ev.title,
    description,
    openGraph: {
      title: ev.title,
      description,
      type: "website",
      url,
      siteName: cal.name ?? "Nevetico",
      // og:image lo inyecta automáticamente la convención opengraph-image.tsx
      // en el mismo segmento de ruta.
    },
    twitter: {
      card: "summary_large_image",
      title: ev.title,
      description,
    },
  };
}

export default async function EventPage({
  params,
}: PageProps<"/c/[calendarSlug]/[eventSlug]">) {
  const { calendarSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: calendar } = await supabase
    .from("calendars")
    .select("id")
    .eq("slug", calendarSlug)
    .maybeSingle();
  if (!calendar) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("calendar_id", calendar.id)
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!event) notFound();

  return <EventPublicView eventId={event.id} />;
}
