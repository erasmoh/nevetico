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
    .select("title, description, status")
    .eq("id", id)
    .maybeSingle();
  if (!ev || ev.status !== "published")
    return { title: "Evento no encontrado" };
  return {
    title: ev.title,
    description: ev.description ?? undefined,
    openGraph: { title: ev.title, description: ev.description ?? undefined },
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
