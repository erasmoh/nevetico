import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Tracking de impresiones y clicks de sponsors en la página pública.
// GET ?event=<id>&name=<sponsor>&type=impression|click&link=<url>
// Sin auth: es un endpoint público llamado desde el render del evento.

export async function GET(req: Request) {
  const url = new URL(req.url);
  const eventId = url.searchParams.get("event");
  const name = url.searchParams.get("name");
  const type = url.searchParams.get("type");
  const link = url.searchParams.get("link") ?? null;

  if (!eventId || !name || !type) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }
  if (type !== "impression" && type !== "click") {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Resolver calendar_id del evento.
    const { data: ev } = await admin
      .from("events")
      .select("calendar_id")
      .eq("id", eventId)
      .maybeSingle();

    // Upsert: si ya existe fila para (event, sponsor, date), incrementa.
    // Si no, la crea. Postgres no tiene upsert con increment en una query
    // via el cliente de Supabase, así que lo hacemos en dos pasos.
    const { data: existing } = await admin
      .from("sponsor_stats")
      .select("id, impressions, clicks")
      .eq("event_id", eventId)
      .eq("sponsor_name", name)
      .eq("stat_date", new Date().toISOString().slice(0, 10))
      .maybeSingle();

    if (existing) {
      await admin
        .from("sponsor_stats")
        .update({
          impressions: type === "impression" ? existing.impressions + 1 : existing.impressions,
          clicks: type === "click" ? existing.clicks + 1 : existing.clicks,
        })
        .eq("id", existing.id);
    } else {
      await admin.from("sponsor_stats").insert({
        event_id: eventId,
        calendar_id: ev?.calendar_id ?? null,
        sponsor_name: name,
        link,
        impressions: type === "impression" ? 1 : 0,
        clicks: type === "click" ? 1 : 0,
      });
    }
  } catch {
    // El tracking nunca debe romper la página.
  }

  if (type === "click" && link) {
    return NextResponse.redirect(link, { status: 302 });
  }
  // Impression: devolver un pixel 1x1 transparente.
  const GIF = Uint8Array.from([
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
    0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
    0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
    0x44, 0x01, 0x00, 0x3b,
  ]);
  return new Response(GIF, {
    headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" },
  });
}
