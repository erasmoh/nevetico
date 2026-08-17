import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueCampaignRecipients } from "@/lib/email/send-campaign";

// Procesa campañas programadas cuyo scheduled_for ya venció. Las encola y las
// marca 'sent'. Protegido por CRON_SECRET. Ejecutar cada ~5-10 min.
//   curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/campaigns/process

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
  }
  const provided = req.headers.get("x-cron-secret");
  const url = new URL(req.url);
  if (provided !== secret && url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: due } = await admin
    .from("email_campaigns")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString());

  const processed = due ?? [];
  let enqueued = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const c of processed) {
    const r = await enqueueCampaignRecipients(c.id);
    enqueued += r.enqueued;
    skipped += r.skipped;
    if (r.error) errors.push(`${c.id}: ${r.error}`);
  }

  return NextResponse.json({
    campaigns: processed.length,
    enqueued,
    skipped,
    errors,
  });
}
