import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/datetime";
import { fetchImageAsDataUrl, BRAND_GRADIENT } from "@/lib/og";

export const alt = "Evento en Nevetico";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ calendarSlug: string; eventSlug: string }>;
}) {
  const { calendarSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: cal } = await supabase
    .from("calendars")
    .select("id, name")
    .eq("slug", calendarSlug)
    .maybeSingle();

  let title = "Evento";
  let dateStr = "";
  let venue = "";
  let calendarName = cal?.name ?? null;
  let coverDataUrl: string | null = null;

  if (cal) {
    const { data: ev } = await supabase
      .from("events")
      .select("title, starts_at, timezone, venue_name, address, cover_url, status")
      .eq("calendar_id", cal.id)
      .eq("slug", eventSlug)
      .maybeSingle();
    if (ev && ev.status === "published") {
      title = ev.title;
      dateStr = formatEventDate(ev.starts_at, ev.timezone);
      venue = ev.venue_name || ev.address || "";
      if (ev.cover_url) {
        coverDataUrl = await fetchImageAsDataUrl(ev.cover_url);
      }
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: coverDataUrl ? "#000000" : BRAND_GRADIENT,
          position: "relative",
        }}
      >
        {coverDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverDataUrl}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.55,
            }}
            alt=""
          />
        ) : null}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "60px",
            flex: 1,
            position: "relative",
          }}
        >
          {calendarName ? (
            <div
              style={{
                fontSize: 24,
                color: "rgba(255,255,255,0.8)",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {calendarName}
            </div>
          ) : null}
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.1,
              maxWidth: 900,
              display: "flex",
            }}
          >
            {title}
          </div>
          {dateStr ? (
            <div
              style={{
                fontSize: 28,
                color: "rgba(255,255,255,0.9)",
                marginTop: 16,
                display: "flex",
              }}
            >
              {dateStr}
            </div>
          ) : null}
          {venue ? (
            <div
              style={{
                fontSize: 22,
                color: "rgba(255,255,255,0.7)",
                marginTop: 8,
                display: "flex",
              }}
            >
              {venue}
            </div>
          ) : null}
          <div
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.5)",
              marginTop: 24,
              display: "flex",
            }}
          >
            nevetico.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
