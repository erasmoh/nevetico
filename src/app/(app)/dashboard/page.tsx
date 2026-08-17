import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate, statusLabel } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, User } from "lucide-react";

export const metadata = { title: "Mis eventos" };

type EventRow = {
  id: string;
  slug: string;
  title: string;
  starts_at: string;
  timezone: string;
  status: string;
  calendar_id: string | null;
  calendar: { slug: string; name: string } | null;
  registrations: { status: string }[];
};

function publicUrl(e: EventRow): string | null {
  if (e.status !== "published") return null;
  if (e.calendar?.slug) return `/c/${e.calendar.slug}/${e.slug}`;
  return `/e/${e.id}`; // evento personal
}

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

  // Eventos de mis comunidades + mis eventos personales (created_by = yo).
  // RLS ya permite ambos conjuntos; el .or() evita traer todos los publicados.
  let events: EventRow[] = [];
  const orFilters: string[] = [`created_by.eq.${user.id}`];
  if (calendarIds.length > 0) {
    orFilters.push(`calendar_id.in.(${calendarIds.join(",")})`);
  }
  const { data } = await supabase
    .from("events")
    .select(
      "id, slug, title, starts_at, timezone, status, calendar_id, calendar:calendars(slug, name), registrations(status)",
    )
    .or(orFilters.join(","))
    .order("starts_at", { ascending: false });
  events = (data ?? []) as EventRow[];

  const goingCount = (e: EventRow) =>
    e.registrations?.filter((r) => r.status === "going").length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis eventos</h1>
        <p className="text-sm text-muted-foreground">
          Tus eventos personales y los de tus comunidades.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-muted-foreground">No tienes eventos todavía.</p>
          <Button className="mt-4" nativeButton={false} render={<Link href="/dashboard/events/new" />}>
            <Plus className="size-4" /> Crear evento
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {events.map((e) => {
            const url = publicUrl(e);
            return (
              <li key={e.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/events/${e.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {e.title}
                    </Link>
                    <Badge variant={e.status === "published" ? "default" : "secondary"}>
                      {statusLabel(e.status)}
                    </Badge>
                    {e.calendar_id === null ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                        <User className="size-3" /> Personal
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {formatEventDate(e.starts_at, e.timezone)} ·{" "}
                    {e.calendar?.name ?? "Personal"} · {goingCount(e)} confirmado(s)
                  </p>
                </div>
                {url ? (
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={url} />}
                  >
                    Ver página
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
