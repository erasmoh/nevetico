import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: PageProps<"/c/[calendarSlug]">): Promise<Metadata> {
  const { calendarSlug } = await params;
  const supabase = await createClient();
  const { data: cal } = await supabase
    .from("calendars")
    .select("name, description")
    .eq("slug", calendarSlug)
    .maybeSingle();
  if (!cal) return { title: "Comunidad no encontrada" };
  return { title: cal.name, description: cal.description ?? undefined };
}

export default async function CalendarPage({
  params,
}: PageProps<"/c/[calendarSlug]">) {
  const { calendarSlug } = await params;
  const supabase = await createClient();

  const { data: calendar } = await supabase
    .from("calendars")
    .select("id, slug, name, description")
    .eq("slug", calendarSlug)
    .maybeSingle();
  if (!calendar) notFound();

  const { data: events } = await supabase
    .from("events")
    .select("id, slug, title, description, starts_at, timezone, venue_name, location_type, status")
    .eq("calendar_id", calendar.id)
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  const { data: past } = await supabase
    .from("events")
    .select("id, slug, title, starts_at, timezone")
    .eq("calendar_id", calendar.id)
    .eq("status", "published")
    .lt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(5);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{calendar.name}</h1>
        {calendar.description ? (
          <p className="text-muted-foreground">{calendar.description}</p>
        ) : null}
      </header>

      <section className="py-6">
        <h2 className="mb-4 text-lg font-semibold">Próximos eventos</h2>
        {events && events.length > 0 ? (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {events.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/c/${calendar.slug}/${e.slug}`}
                  className="flex flex-col gap-1 p-4 hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{e.title}</span>
                    <Badge variant="secondary">
                      {e.location_type === "online"
                        ? "En línea"
                        : e.location_type === "hybrid"
                          ? "Híbrido"
                          : "Presencial"}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatEventDate(e.starts_at, e.timezone)}
                    {e.venue_name ? ` · ${e.venue_name}` : ""}
                  </span>
                  {e.description ? (
                    <span className="line-clamp-2 text-sm text-muted-foreground">
                      {e.description}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay eventos próximos. Vuelve pronto.
          </p>
        )}
      </section>

      {past && past.length > 0 ? (
        <section className="py-6">
          <h2 className="mb-4 text-lg font-semibold">Eventos pasados</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {past.map((e) => (
              <li key={e.id} className="text-muted-foreground">
                {formatEventDate(e.starts_at, e.timezone)} —{" "}
                <Link href={`/c/${calendar.slug}/${e.slug}`} className="hover:underline">
                  {e.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
