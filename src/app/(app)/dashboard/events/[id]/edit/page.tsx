import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventEditForm } from "@/components/events/event-edit-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Editar evento" };

export default async function EditEventPage({
  params,
}: PageProps<"/dashboard/events/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, calendar_id, title, slug, description, cover_url, starts_at, ends_at, timezone, location_type, venue_name, address, online_url, capacity, status",
    )
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  const { data: isMember } = await supabase.rpc("is_event_organizer", {
    ev_id: id,
  });
  if (!isMember) notFound();

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Editar evento</CardTitle>
        <CardDescription>{event.title}</CardDescription>
      </CardHeader>
      <CardContent>
        <EventEditForm eventId={id} event={event} />
      </CardContent>
    </Card>
  );
}
