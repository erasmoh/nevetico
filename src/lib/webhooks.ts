import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "node:crypto";

/**
 * API keys y webhooks. Las API keys se guardan hasheadas (SHA-256); el valor
 * en plano se muestra solo al crearlas. Los webhooks se firman con HMAC
 * (X-Nevetico-Signature) y se entregan vía fetch con reintentos implícitos
 * (la tabla webhook_deliveries registra el resultado).
 */

export function hashApiKey(key: string): string {
  return createHmac("sha256", "nevetico-api-key").update(key).digest("hex");
}

export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `nvt_${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Valida una API key y devuelve el calendar_id asociado, o null si no existe. */
export async function validateApiKey(
  key: string,
): Promise<{ calendarId: string } | null> {
  if (!key.startsWith("nvt_")) return null;
  const hash = hashApiKey(key);
  const admin = createAdminClient();
  const { data } = await admin
    .from("api_keys")
    .select("id, calendar_id, revoked_at")
    .eq("key_hash", hash)
    .maybeSingle();
  if (!data || data.revoked_at) return null;
  // Actualizar last_used_at (sin await para no bloquear).
  void admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);
  return { calendarId: data.calendar_id };
}

/** Eventos que pueden disparar webhooks. */
export type WebhookEvent =
  | "registration.created"
  | "event.published"
  | "event.completed"
  | "checkin.created"
  | "campaign.sent";

/**
 * Dispara webhooks para un evento de un calendario. Busca los webhooks
 * habilitados suscritos al evento, les POSTea el payload firmado y registra
 * la entrega. Se llama desde las server actions que disparan eventos
 * (RSVP, publish, checkin, etc.).
 */
export async function fireWebhooks(
  calendarId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  const { data: hooks } = await admin
    .from("webhooks")
    .select("id, url, events, secret")
    .eq("calendar_id", calendarId)
    .eq("enabled", true);

  for (const hook of hooks ?? []) {
    const events = hook.events as string[] | null;
    if (events && !events.includes(event)) continue;

    const body = JSON.stringify({ event, data: payload, sent_at: new Date().toISOString() });
    const signature = createHmac("sha256", hook.secret).update(body).digest("hex");

    try {
      const res = await fetch(hook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Nevetico-Signature": signature,
          "X-Nevetico-Event": event,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      const responseBody = await res.text().catch(() => "");
      await admin.from("webhook_deliveries").insert({
        webhook_id: hook.id,
        event_type: event,
        payload: body as unknown as import("@/lib/database.types").Json,
        status_code: res.status,
        response_body: responseBody.slice(0, 2000),
        success: res.ok,
      });
    } catch (err) {
      await admin.from("webhook_deliveries").insert({
        webhook_id: hook.id,
        event_type: event,
        payload: body as unknown as import("@/lib/database.types").Json,
        success: false,
        response_body: String(err).slice(0, 2000),
      });
    }
  }
}
