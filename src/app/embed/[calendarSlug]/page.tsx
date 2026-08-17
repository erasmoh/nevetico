import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/datetime";

export const metadata = { title: "Próximos eventos" };

// Widget embebible: lista ligera de próximos eventos de una comunidad.
// Sin navegación ni chrome — diseñado para embeber en un iframe en el sitio
// de la comunidad. Ej: <iframe src="https://nevetico.app/embed/tech-meetup-cdmx" />

export const dynamic = "force-dynamic";

export default async function EmbedPage({
  params,
}: PageProps<"/embed/[calendarSlug]">) {
  const { calendarSlug } = await params;
  const supabase = await createClient();

  const { data: calendar } = await supabase
    .from("calendars")
    .select("id, name, slug")
    .eq("slug", calendarSlug)
    .maybeSingle();
  if (!calendar) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Comunidad no encontrada.
      </div>
    );
  }

  const { data: events } = await supabase
    .from("events")
    .select("id, slug, title, starts_at, timezone, venue_name, address")
    .eq("calendar_id", calendar.id)
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(10);

  const list = events ?? [];

  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, fontFamily: "system-ui, sans-serif", background: "transparent" }}>
        <div style={{ maxWidth: 480, margin: 0, padding: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
            {calendar.name}
          </h2>
          {list.length === 0 ? (
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              No hay eventos próximos.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {list.map((e) => (
                <li
                  key={e.id}
                  style={{
                    padding: 12,
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                  }}
                >
                  <a
                    href={`/${calendarSlug}/${e.slug}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                      {e.title}
                    </p>
                    <p style={{ fontSize: 12, color: "#6b7280", margin: "4px 0 0" }}>
                      {formatEventDate(e.starts_at, e.timezone)}
                    </p>
                    {e.venue_name ? (
                      <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>
                        {e.venue_name}
                      </p>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 12, textAlign: "right" }}>
            Powered by Nevetico
          </p>
        </div>
      </body>
    </html>
  );
}
