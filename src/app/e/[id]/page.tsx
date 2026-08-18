import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EventPublicView } from "@/components/event/event-public-view";

// URL pública de eventos personales (sin comunidad): /e/[id]
export async function generateMetadata({
  params,
}: PageProps<"/e/[id]">): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("events")
    .select("title, description, starts_at, timezone, venue_name, status, cover_url")
    .eq("id", id)
    .maybeSingle();
  if (!ev || ev.status !== "published")
    return { title: "Evento no encontrado" };

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const url = `${siteUrl}/e/${id}`;
  const description = ev.description ?? `Únete a ${ev.title} en Nevetico.`;

  return {
    title: ev.title,
    description,
    openGraph: {
      title: ev.title,
      description,
      type: "website",
      url,
      siteName: "Nevetico",
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

export default async function PersonalEventPage({
  params,
}: PageProps<"/e/[id]">) {
  const { id } = await params;
  // Validar formato UUID para no golpear la DB con cualquier string.
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) notFound();

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  return <EventPublicView eventId={event.id} />;
}
