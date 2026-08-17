import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/email/tracking";

// Redirect de tracking de clicks. Registra `email_events('clicked')` con la URL
// de destino y redirige a ella (solo http/https/mailto; si no, al root).

const SAFE = /^(https?:\/\/|mailto:)/i;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const dest = url.searchParams.get("u") ?? "/";
  const queueId = token ? verifyToken(token) : null;

  if (queueId) {
    try {
      const admin = createAdminClient();
      const { data: row } = await admin
        .from("email_queue")
        .select("id, calendar_id, campaign_id")
        .eq("id", queueId)
        .maybeSingle();
      if (row) {
        await admin.from("email_events").insert({
          queue_id: queueId,
          calendar_id: row.calendar_id,
          campaign_id: row.campaign_id,
          event_type: "clicked",
          url: dest.slice(0, 1000),
        });
      }
    } catch {
      // no romper el redirect
    }
  }

  const target = SAFE.test(dest) ? dest : new URL("/", url.origin).toString();
  return NextResponse.redirect(target, { status: 302 });
}
