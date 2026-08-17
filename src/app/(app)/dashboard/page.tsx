import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate, statusLabel } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const metadata = { title: "Mis eventos" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?from=dashboard");

  const { data: memberships } = await supabase
    .from("calendar_members")
    .select("calendar_id")
    .eq("user_id", user.id)
    .in("role", ["owner", "host"]);

  const calendarIds = (memberships ?? []).map((m) => m.calendar_id);

  let events: Array<{
    id: string;
    slug: string;
    title: string;
    starts_at: string;
    timezone: string;
    status: string;
    calendar: { slug: string; name: string } | null;
    registrations: { status: string }[];
  }> = [];

  if (calendarIds.length > 0) {
    const { data } = await supabase
      .from("events")
      .select(
        "id, slug, title, starts_at, timezone, status, calendar:calendars(slug, name), registrations(status)",
      )
      .in("calendar_id", calendarIds)
      .order("starts_at", { ascending: false });
    events = (data ?? []) as typeof events;
  }

  const goingCount = (e: (typeof events)[number]) =>
    e.registrations?.filter((r) => r.status === "going").length ?? 0;

  const hasCalendars = calendarIds.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis eventos</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona los eventos de tus comunidades.
        </p>
      </div>

      {!hasCalendars ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-muted-foreground">
            Aún no tienes una comunidad. Crea una para empezar a organizar eventos.
          </p>
          <Button className="mt-4" render={<Link href="/dashboard/calendars/new" />}>
            <Plus className="size-4" /> Crear comunidad
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-muted-foreground">No tienes eventos todavía.</p>
          <Button className="mt-4" render={<Link href="/dashboard/events/new" />}>
            <Plus className="size-4" /> Crear evento
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/events/${e.id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {e.title}
                  </Link>
                  <Badge variant={e.status === "published" ? "default" : "secondary"}>
                    {statusLabel(e.status)}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {formatEventDate(e.starts_at, e.timezone)} · {e.calendar?.name} ·{" "}
                  {goingCount(e)} confirmado(s)
                </p>
              </div>
              {e.status === "published" && e.calendar?.slug ? (
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/c/${e.calendar.slug}/${e.slug}`} />}
                >
                  Ver página
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
