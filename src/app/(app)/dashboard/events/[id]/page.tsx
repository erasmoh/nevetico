import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate, statusLabel } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EventActions } from "@/components/events/event-actions";
import { QrCodeIcon, Pencil, Download } from "lucide-react";

export const metadata = { title: "Gestión del evento" };

export default async function EventDetailPage({
  params,
}: PageProps<"/dashboard/events/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event } = await supabase
    .from("events")
    .select(
      "id, slug, title, description, starts_at, timezone, status, capacity, location_type, venue_name, address, online_url, calendar:calendars(slug, name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!event || !event.calendar) notFound();

  // Verificar que el usuario es organizador de la comunidad.
  const { data: isMember } = await supabase.rpc("is_event_organizer", {
    ev_id: id,
  });
  if (!isMember) notFound();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, name, email, status, created_at, user_id")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  const regs = registrations ?? [];
  const going = regs.filter((r) => r.status === "going").length;
  const waitlist = regs.filter((r) => r.status === "waitlist").length;
  const checkedIn = regs.filter((r) => r.status === "checked_in").length;

  const publicUrl =
    event.status === "published"
      ? `/c/${event.calendar.slug}/${event.slug}`
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
          <Badge variant={event.status === "published" ? "default" : "secondary"}>
            {statusLabel(event.status)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatEventDate(event.starts_at, event.timezone)} · {event.calendar.name}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/dashboard/events/${id}/edit`} />}>
            <Pencil className="size-4" /> Editar
          </Button>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/dashboard/events/${id}/checkin`} />}>
            <QrCodeIcon className="size-4" /> Check-in
          </Button>
          <Button size="sm" variant="outline" nativeButton={false} render={<a href={`/dashboard/events/${id}/export`} />}>
            <Download className="size-4" /> Exportar CSV
          </Button>
        </div>
        <EventActions eventId={id} status={event.status} publicUrl={publicUrl} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Confirmados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {going}
              {event.capacity ? <span className="text-muted-foreground"> / {event.capacity}</span> : null}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lista de espera
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{waitlist}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Acreditados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{checkedIn}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Asistentes</CardTitle>
        </CardHeader>
        <CardContent>
          {regs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay registros.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Registrado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.name ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{statusLabel(r.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("es-MX")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
