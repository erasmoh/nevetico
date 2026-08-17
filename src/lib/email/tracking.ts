import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tokens firmados (HMAC-SHA256) para tracking de emails y baja de suscripción.
 * Codifican el `queue_id` (id de la fila en `email_queue`) sin exponerlo como
 * texto plano, para evitar enumeración. El secreto es `TRACKING_SECRET` o, si
 * no está, `CRON_SECRET` (reusamos el que ya existe para el worker).
 */
function secret(): string {
  const s = process.env.TRACKING_SECRET ?? process.env.CRON_SECRET;
  if (!s) throw new Error("TRACKING_SECRET (o CRON_SECRET) no configurado");
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signToken(queueId: string): string {
  const mac = createHmac("sha256", secret()).update(queueId).digest();
  return `${b64url(mac)}.${b64url(Buffer.from(queueId))}`;
}

export function verifyToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [macB64, idB64] = parts;
  let queueId: string;
  let expectedMac: Buffer;
  try {
    queueId = b64urlDecode(idB64).toString("utf8");
    expectedMac = createHmac("sha256", secret()).update(queueId).digest();
  } catch {
    return null;
  }
  const givenMac = b64urlDecode(macB64);
  if (givenMac.length !== expectedMac.length) return null;
  try {
    if (!timingSafeEqual(givenMac, expectedMac)) return null;
  } catch {
    return null;
  }
  return queueId;
}
