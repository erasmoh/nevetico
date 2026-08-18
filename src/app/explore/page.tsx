import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/datetime";
import { ExploreFilters } from "@/components/explore/explore-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Explorar eventos",
  description:
    "Descubre eventos y comunidades tech cerca de ti. Meetups, conferencias, workshops y más.",
};

export default async function ExplorePage({
  searchParams,
}: PageProps<"/explore">) {
  const sp = await searchParams;
  const { t } = await getI18n();
  const q = (sp.q as string | undefined)?.trim() ?? "";
  const city = (sp.city as string | undefined) ?? "";
  const topic = (sp.topic as string | undefined) ?? "";
  const when = (sp.when as string | undefined) ?? "";
  const page = Math.max(1, Number(sp.page as string | undefined) || 1);
  const perPage = 24;

  const supabase = await createClient();
  const now = new Date().toISOString();

  // Query base: eventos publicados.
  let query = supabase
    .from("events")
    .select(
      "id, slug, title, description, starts_at, timezone, venue_name, address, city, topic, location_type, cover_url, calendar:calendars(slug, name)",
      { count: "exact" },
    )
    .eq("status", "published");

  // Filtro de fecha.
  if (when === "past") {
    query = query.lt("starts_at", now).order("starts_at", { ascending: false });
  } else {
    query = query.gte("starts_at", now).order("starts_at", { ascending: true });
    if (when === "today") {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte("starts_at", endOfDay.toISOString());
    } else if (when === "week") {
      const endOfWeek = new Date();
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      query = query.lte("starts_at", endOfWeek.toISOString());
    } else if (when === "month") {
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      query = query.lte("starts_at", endOfMonth.toISOString());
    }
  }

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (city) query = query.eq("city", city);
  if (topic) query = query.eq("topic", topic);

  const { data: events, count } = await query.range(
    (page - 1) * perPage,
    page * perPage - 1,
  );

  // Ciudades y temas disponibles para los filtros (de eventos publicados
  // futuros, sin aplicar los filtros activos para que el usuario pueda
  // combinarlos).
  const { data: citiesData } = await supabase
    .from("events")
    .select("city")
    .eq("status", "published")
    .gte("starts_at", now)
    .not("city", "is", null);

  const { data: topicsData } = await supabase
    .from("events")
    .select("topic")
    .eq("status", "published")
    .gte("starts_at", now)
    .not("topic", "is", null);

  const cities = [...new Set((citiesData ?? []).map((r) => r.city).filter(Boolean))].sort();
  const topics = [...new Set((topicsData ?? []).map((r) => r.topic).filter(Boolean))].sort();

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / perPage));

  type EventRow = {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    starts_at: string;
    timezone: string;
    venue_name: string | null;
    address: string | null;
    city: string | null;
    topic: string | null;
    location_type: string;
    cover_url: string | null;
    calendar: { slug: string; name: string } | null;
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("explore.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("explore.subtitle")}
        </p>
      </header>

      <div className="mb-6">
        <ExploreFilters
          cities={cities}
          topics={topics}
          currentCity={city}
          currentTopic={topic}
          currentQuery={q}
          currentWhen={when}
        />
      </div>

      {(events ?? []).length === 0 ? (
        <div className="rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">
            {t("explore.empty")}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            nativeButton={false}
            render={<Link href="/explore" />}
          >
            {t("explore.clear")}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(events as EventRow[]).map((e) => {
              const href = e.calendar?.slug
                ? `/c/${e.calendar.slug}/${e.slug}`
                : `/e/${e.id}`;
              return (
                <Link
                  key={e.id}
                  href={href}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border transition-colors hover:border-primary/40"
                >
                  {e.cover_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={e.cover_url}
                      alt=""
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video w-full items-center justify-center bg-muted">
                      <span className="text-3xl font-semibold text-muted-foreground/40">
                        {e.title.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {e.topic && (
                        <Badge variant="secondary">{e.topic}</Badge>
                      )}
                      <Badge variant="outline">
                        {e.location_type === "online"
                          ? t("explore.loc.online")
                          : e.location_type === "hybrid"
                            ? t("explore.loc.hybrid")
                            : t("explore.loc.inperson")}
                      </Badge>
                    </div>
                    <h3 className="font-medium leading-tight group-hover:text-primary">
                      {e.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatEventDate(e.starts_at, e.timezone)}
                    </p>
                    <div className="mt-auto flex items-center gap-2 text-xs text-muted-foreground">
                      {e.calendar?.name && <span>{e.calendar.name}</span>}
                      {e.city && <span>· {e.city}</span>}
                      {e.venue_name && !e.city && <span>· {e.venue_name}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/explore?${buildParams(sp, { page: String(page - 1) })}`}
                    />
                  }
                >
                  {t("explore.prev")}
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {t("explore.page")} {page} {t("explore.page.of")} {totalPages}
              </span>
              {page < totalPages && (
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/explore?${buildParams(sp, { page: String(page + 1) })}`}
                    />
                  }
                >
                  {t("explore.next")}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function buildParams(
  sp: Record<string, string | string[] | undefined>,
  overrides: Record<string, string>,
): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") next.set(k, v);
  }
  for (const [k, v] of Object.entries(overrides)) {
    next.set(k, v);
  }
  return next.toString();
}
