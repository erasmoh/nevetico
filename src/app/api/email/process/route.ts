import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Procesa la cola de emails. Protegida por CRON_SECRET.
// - Sin RESEND_API_KEY: marca como 'sent' (stub de desarrollo).
// - Con RESEND_API_KEY: envía de verdad con Resend (POST a /emails).
// En producción invocar con un cron (Vercel Cron, Supabase cron, etc.):
//   curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/email/process

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado" },
      { status: 500 },
    );
  }
  const provided = req.headers.get("x-cron-secret");
  const url = new URL(req.url);
  if (provided !== secret && url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail =
    process.env.EMAIL_FROM ?? "Nevetico <no-reply@nevetico.local>";

  const { data: pending } = await admin
    .from("email_queue")
    .select("id, to_email, to_name, subject, payload, attempts")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(50);

  const emails = pending ?? [];
  let sent = 0;
  let failed = 0;

  for (const e of emails) {
    if (resendKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [e.to_email],
            subject: e.subject,
            text: renderText(e.subject, e.payload as Record<string, unknown> | null),
          }),
        });
        if (res.ok) {
          await markSent(admin, e.id);
          sent++;
        } else {
          await markFailed(admin, e.id, `resend ${res.status}`);
          failed++;
        }
      } catch (err) {
        await markFailed(admin, e.id, String(err));
        failed++;
      }
    } else {
      // Stub: no hay Resend configurado. Marcamos como enviado y logueamos.
      console.log(
        `[email][stub] to=${e.to_email} subject="${e.subject}"`,
      );
      await markSent(admin, e.id);
      sent++;
    }
  }

  return NextResponse.json({ sent, failed, total: emails.length });
}

async function markSent(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
) {
  await admin
    .from("email_queue")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id);
}

async function markFailed(
  admin: ReturnType<typeof createAdminClient>,
  id: string,
  error: string,
) {
  await admin
    .from("email_queue")
    .update({
      status: "failed",
      last_error: error.slice(0, 500),
      attempts: 1,
    })
    .eq("id", id);
}

function renderText(
  subject: string,
  payload: Record<string, unknown> | null,
): string {
  const p = payload ?? {};
  const title = typeof p.event_title === "string" ? p.event_title : "";
  const startsAt = typeof p.starts_at === "string" ? p.starts_at : "";
  const status = typeof p.status === "string" ? p.status : "";
  const calendarName =
    typeof p.calendar_name === "string" ? p.calendar_name : "";

  if (status === "waitlist") {
    return `Te añadimos a la lista de espera para "${title}". Te avisaremos si hay lugar.`;
  }
  return [
    `Confirmado: ${title}`,
    calendarName ? `Comunidad: ${calendarName}` : "",
    startsAt ? `Cuándo: ${startsAt}` : "",
    "",
    "Gracias por registrarte.",
  ]
    .filter(Boolean)
    .join("\n");
}
