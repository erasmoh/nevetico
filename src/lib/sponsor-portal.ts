import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Tokens para el portal del sponsor. Codifican `eventId:sponsorName` sin
 * exponerlos como texto plano. Se generan al compartir el link del portal y
 * se verifican al abrir `/s/[token]`.
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

export function signSponsorToken(eventId: string, sponsorName: string): string {
  const payload = `${eventId}:${sponsorName}`;
  const mac = createHmac("sha256", secret()).update(payload).digest();
  return `${b64url(mac)}.${b64url(Buffer.from(payload))}`;
}

export function verifySponsorToken(
  token: string,
): { eventId: string; sponsorName: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [macB64, payloadB64] = parts;
  let payload: string;
  let expectedMac: Buffer;
  try {
    payload = b64urlDecode(payloadB64).toString("utf8");
    expectedMac = createHmac("sha256", secret()).update(payload).digest();
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
  const sep = payload.indexOf(":");
  if (sep < 0) return null;
  return { eventId: payload.slice(0, sep), sponsorName: payload.slice(sep + 1) };
}
