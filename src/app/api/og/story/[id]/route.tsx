import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/datetime";
import { fetchImageAsDataUrl, BRAND_GRADIENT } from "@/lib/og";

// Genera una imagen 1080x1920 (9:16) optimizada para Instagram Stories.
// Respeta las "safe zones" de IG: el header (~250px arriba) y la UI de
// interacción (~400px abajo) no deben tener contenido crítico.
//   GET /api/og/story/[id]

export const size = { width: 1080, height: 1920 };
export const contentType = "image/png";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: ev } = await supabase
    .from("events")
    .select(
      "title, description, starts_at, timezone, venue_name, address, cover_url, status, calendar:calendars(name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!ev || ev.status !== "published") {
    return new Response("Event not found", { status: 404 });
  }

  const cal = ev.calendar as { name: string } | null;
  const title = ev.title;
  const dateStr = formatEventDate(ev.starts_at, ev.timezone);
  const venue = ev.venue_name || ev.address || "";
  let coverDataUrl: string | null = null;
  if (ev.cover_url) {
    coverDataUrl = await fetchImageAsDataUrl(ev.cover_url);
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
              opacity: 0.5,
            }}
            alt=""
          />
        ) : null}

        {/* Safe zone superior (IG header) — vacía */}
        <div style={{ height: 280, display: "flex" }} />

        {/* Contenido principal centrado verticalmente */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: "0 80px",
            position: "relative",
          }}
        >
          {cal?.name ? (
            <div
              style={{
                fontSize: 32,
                color: "rgba(255,255,255,0.8)",
                marginBottom: 24,
                display: "flex",
                backgroundColor: "rgba(0,0,0,0.3)",
                padding: "8px 24px",
                borderRadius: 100,
              }}
            >
              {cal.name}
            </div>
          ) : null}
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#ffffff",
              textAlign: "center",
              lineHeight: 1.1,
              display: "flex",
            }}
          >
            {title}
          </div>
          {dateStr ? (
            <div
              style={{
                fontSize: 36,
                color: "rgba(255,255,255,0.95)",
                marginTop: 32,
                display: "flex",
              }}
            >
              {dateStr}
            </div>
          ) : null}
          {venue ? (
            <div
              style={{
                fontSize: 28,
                color: "rgba(255,255,255,0.7)",
                marginTop: 16,
                display: "flex",
              }}
            >
              {venue}
            </div>
          ) : null}
        </div>

        {/* CTA inferior (encima de la safe zone de IG) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "0 80px 440px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              backgroundColor: "#ffffff",
              padding: "20px 48px",
              borderRadius: 100,
              fontSize: 32,
              fontWeight: 600,
              color: "#7c3aed",
            }}
          >
            Regístrate en nevetico.app
          </div>
          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.5)",
              marginTop: 20,
              display: "flex",
            }}
          >
            Powered by Nevetico
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
