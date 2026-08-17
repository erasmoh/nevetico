import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/email/tracking";

// Pixel de apertura 1x1 transparente (GIF). Registra `email_events('opened')`
// una sola vez por queue_id (dedupe) y devuelve la imagen.

const GIF = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
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
        // dedupe: solo registramos la primera apertura.
        const { count } = await admin
          .from("email_events")
          .select("id", { count: "exact", head: true })
          .eq("queue_id", queueId)
          .eq("event_type", "opened");
        if ((count ?? 0) === 0) {
          await admin.from("email_events").insert({
            queue_id: queueId,
            calendar_id: row.calendar_id,
            campaign_id: row.campaign_id,
            event_type: "opened",
          });
        }
      }
    } catch {
      // El pixel nunca debe romper el render del email.
    }
  }

  return new Response(GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, max-age=0",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
