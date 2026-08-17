import { NextResponse } from "next/server";
import { renderEmailHtml, type EmailBlock } from "@/lib/email/render";
import { z } from "zod";

// Devuelve el HTML de email para un set de bloques (vista previa del editor de
// campañas). No accede a la DB ni mete tracking: usa variables de muestra.

const bodySchema = z.object({
  subject: z.string().max(200).optional(),
  blocks: z
    .array(z.object({ type: z.string(), config: z.record(z.string(), z.unknown()) }))
    .max(50),
  vars: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const sampleVars = {
    first_name: "Ana",
    name: "Ana Pérez",
    email: "ana@ejemplo.com",
    calendar_name: "Tech Meetup CDMX",
    event_title: "Meetup de agosto",
    event_date: "vie 22 ago 2026 19:00",
    event_venue: "Impact Hub CDMX",
    event_address: "Av. Reforma 123, CDMX",
    rsvp_url: "https://nevetico.local/c/tech-meetup-cdmx/meetup-agosto",
    ...parsed.data.vars,
  } as Record<string, string | undefined>;

  const html = renderEmailHtml(parsed.data.blocks as EmailBlock[], {
    vars: sampleVars,
    subject: parsed.data.subject,
  });
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
