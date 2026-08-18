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
import { IssueCertificatesButton } from "@/components/events/issue-certificates-button";
import { QrCodeIcon, Pencil, Download, Palette, Ticket } from "lucide-react";

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
      "id, slug, title, description, starts_at, timezone, status, capacity, location_type, venue_name, address, online_url, calendar_id, calendar:calendars(slug, name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!event) notFound();
  const calendar = event.calendar as { slug: string; name: string } | null;

  // Verificar que el usuario es organizador (comunidad o creador del personal).
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

  // Top referrers (atribuciones de referral para este evento).
  const { data: referrers } = await supabase
    .from("referral_attributions")
    .select("referrer_id, ref_code, registration_id")
    .eq("event_id", id);

  const referrerCounts = new Map<string, { code: string; count: number }>();
  for (const r of referrers ?? []) {
    const existing = referrerCounts.get(r.referrer_id);
    if (existing) existing.count++;
    else referrerCounts.set(r.referrer_id, { code: r.ref_code, count: 1 });
  }
  const topReferrers = [...referrerCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const publicUrl =
    event.status === "published"
      ? calendar?.slug
        ? `/c/${calendar.slug}/${event.slug}`
        : `/e/${event.id}`
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{event.title}</h1>
          <Badge variant={event.status === "published" ? "default" : "secondary"}>
            {statusLabel(event.status)}
          </Badge>
          {event.calendar_id === null ? (
            <Badge variant="outline">Personal</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {formatEventDate(event.starts_at, event.timezone)} ·{" "}
          {calendar?.name ?? "Evento personal"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/dashboard/events/${id}/edit`} />}>
            <Pencil className="size-4" /> Editar
          </Button>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/dashboard/events/${id}/design`} />}>
            <Palette className="size-4" /> Diseño
          </Button>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/dashboard/events/${id}/checkin`} />}>
            <QrCodeIcon className="size-4" /> Check-in
          </Button>
          <Button size="sm" variant="outline" nativeButton={false} render={<a href={`/dashboard/events/${id}/export`} />}>
            <Download className="size-4" /> Exportar CSV
          </Button>
          <IssueCertificatesButton eventId={id} />
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/dashboard/events/${id}/cfp`} />}>
            CFP
          </Button>
          <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/dashboard/events/${id}/tickets`} />}>
            <Ticket className="size-4" /> Tickets
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

      {topReferrers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top referrers</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {topReferrers.map(([referrerId, info], i) => (
                <li
                  key={referrerId}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">#{i + 1}</span>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {info.code}
                    </code>
                  </span>
                  <span className="font-medium">{info.count} registros</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
