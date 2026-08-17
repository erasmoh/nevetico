import { NextResponse } from "next/server";
import { runTimeBasedAutomations } from "@/lib/email/automation-engine";

// Cron de automatizaciones temporales (recordatorios 24h/1h, post-evento,
// no-show). Protegido por CRON_SECRET. Ejecutar cada ~10-15 min.
//   curl -H "x-cron-secret: $CRON_SECRET" http://localhost:3000/api/automations/run

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
  const result = await runTimeBasedAutomations();
  return NextResponse.json(result);
}
