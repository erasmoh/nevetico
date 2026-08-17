import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CheckinClient } from "@/components/events/checkin-client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Check-in" };

export default async function CheckinPage({
  params,
}: PageProps<"/dashboard/events/[id]/checkin">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  const { data: isMember } = await supabase.rpc("is_event_organizer", {
    ev_id: id,
  });
  if (!isMember) notFound();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, name, email, status")
    .eq("event_id", id)
    .in("status", ["going", "checked_in"])
    .order("name", { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/dashboard/events/${id}`} />}>
          <ArrowLeft className="size-4" /> Volver al evento
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Check-in · {event.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Busca al asistente o pega el ID de su QR para acreditarlo.
        </p>
      </div>
      <CheckinClient
        eventId={id}
        attendees={(registrations ?? []) as never}
      />
    </div>
  );
}
