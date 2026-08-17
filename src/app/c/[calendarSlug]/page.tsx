import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/datetime";
import { Badge } from "@/components/ui/badge";
import { parseTheme, themeCss, themeModeClass, themeScope } from "@/lib/theme";

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
    .select("id, slug, name, description, theme, logo_url, cover_url")
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

  const theme = parseTheme(calendar.theme);
  const scope = themeScope(`cal-${calendar.slug}`);

  return (
    <div
      data-nvt={scope}
      className={`mx-auto w-full max-w-3xl px-4 py-10 font-sans ${themeModeClass(theme)}`}
    >
      <style>{themeCss(scope, theme)}</style>
      {calendar.cover_url ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={calendar.cover_url}
          alt=""
          className="mb-6 h-40 w-full rounded-xl object-cover sm:h-56"
        />
      ) : null}
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          {calendar.logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={calendar.logo_url}
              alt={calendar.name}
              className="size-12 rounded-lg border border-border object-cover"
            />
          ) : null}
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {calendar.name}
          </h1>
        </div>
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
