import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateApiKey } from "@/lib/webhooks";

// API pública: lista los próximos eventos publicados de una comunidad.
//   GET /api/v1/calendars/[slug]/events
//   Auth: X-API-Key header o ?key= query param.

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(req.url);

  // API key (header o query).
  const apiKey =
    req.headers.get("x-api-key") ?? url.searchParams.get("key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key. Pass it via X-API-Key header or ?key= param." },
      { status: 401 },
    );
  }

  const valid = await validateApiKey(apiKey);
  if (!valid) {
    return NextResponse.json({ error: "Invalid API key." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: calendar } = await supabase
    .from("calendars")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!calendar) {
    return NextResponse.json({ error: "Calendar not found." }, { status: 404 });
  }
  if (calendar.id !== valid.calendarId) {
    return NextResponse.json(
      { error: "API key not valid for this calendar." },
      { status: 403 },
    );
  }

  const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 100);
  const { data: events } = await supabase
    .from("events")
    .select("id, slug, title, description, starts_at, ends_at, timezone, location_type, venue_name, address, online_url, capacity, status")
    .eq("calendar_id", calendar.id)
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);

  return NextResponse.json({
    calendar: { slug: calendar.slug, name: calendar.name },
    events: events ?? [],
  });
}
