import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function csvCell(value: string): string {
  const needsQuote = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autenticado", { status: 401 });

  const { data: isMember } = await supabase.rpc("is_event_organizer", {
    ev_id: id,
  });
  if (!isMember) return new NextResponse("No autorizado", { status: 403 });

  const { data: event } = await supabase
    .from("events")
    .select("title, slug, calendar:calendars(slug)")
    .eq("id", id)
    .maybeSingle();
  if (!event) return new NextResponse("Evento no encontrado", { status: 404 });

  const { data: registrations } = await supabase
    .from("registrations")
    .select("name, email, status, created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  const header = ["Nombre", "Correo", "Estado", "Registrado"];
  const rows = (registrations ?? []).map((r) => [
    r.name ?? "",
    r.email,
    r.status,
    new Date(r.created_at).toISOString(),
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((c) => csvCell(String(c ?? ""))).join(","))
    .join("\r\n");

  const slug = (event as { slug: string }).slug;
  const filename = `asistentes-${slug}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
