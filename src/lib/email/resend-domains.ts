import "server-only";

/**
 * Cliente mínimo de la API de Resend para dominios verificados.
 * Docs: https://resend.com/docs/api-reference/domains
 * Requiere RESEND_API_KEY. Sin ella, las funciones lanzan un error claro
 * (la verificación real de dominios no es posible en local sin key ni DNS).
 */

const API = "https://api.resend.com";

export type ResendRecord = {
  record: string;
  type: "TXT" | "MX" | "CNAME";
  name: string;
  ttl: number | string;
  status: "verified" | "pending" | "not_started";
  value: string;
  priority?: number;
};

export type DomainStatus = "pending" | "verified" | "failed";

export type ResendDomain = {
  id: string;
  name: string;
  status: "verified" | "pending" | "failed";
  region: string;
  records: ResendRecord[];
  created_at: string;
};

function key(): string {
  const k = process.env.RESEND_API_KEY;
  if (!k) throw new Error("RESEND_API_KEY no configurado (necesario para gestionar dominios).");
  return k;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key()}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      data && typeof data === "object" && "message" in data
        ? String((data as { message: unknown }).message)
        : `resend ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

/** Crea un dominio en Resend. Devuelve los registros DNS a configurar. */
export async function createDomain(domain: string): Promise<ResendDomain> {
  return call<ResendDomain>("/domains", {
    method: "POST",
    body: JSON.stringify({ name: domain, region: "us-east-1" }),
  });
}

/** Obtiene el estado actual del dominio (y reconsulta DNS). */
export async function getDomain(id: string): Promise<ResendDomain> {
  return call<ResendDomain>(`/domains/${encodeURIComponent(id)}`);
}

/** Fuerza la verificación de los registros DNS. */
export async function verifyDomain(id: string): Promise<ResendDomain> {
  return call<ResendDomain>(`/domains/${encodeURIComponent(id)}/verify`, {
    method: "POST",
  });
}

export async function deleteDomain(id: string): Promise<void> {
  await call<{ id: string }>(`/domains/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/** Normaliza el estado de Resend al nuestro (pending/verified/failed). */
export function normalizeStatus(raw: string): DomainStatus {
  if (raw === "verified") return "verified";
  if (raw === "failed") return "failed";
  return "pending";
}
