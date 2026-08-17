/**
 * Resolución de dominios propios: dado el host de la request, devuelve el slug
 * de la comunidad que lo tiene configurado en `calendars.custom_domain`.
 *
 * Se consulta la API REST de Supabase directamente (el proxy corre en el edge
 * runtime) y se cachea en memoria un rato para no pegarle a la DB en cada
 * request.
 */

const TTL_MS = 60_000;
const cache = new Map<string, { slug: string | null; at: number }>();

/** Hosts que sirven la app en sí (no son dominios de comunidad). */
function isAppHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
    return true;
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      if (new URL(siteUrl).hostname.toLowerCase() === host) return true;
    } catch {
      // NEXT_PUBLIC_SITE_URL mal formado: se ignora.
    }
  }
  const appHost = process.env.NEXT_PUBLIC_APP_HOST?.toLowerCase();
  if (appHost && (host === appHost || host.endsWith(`.${appHost}`))) return true;
  return false;
}

export async function calendarSlugForHost(
  rawHost: string | null,
): Promise<string | null> {
  const host = (rawHost ?? "").split(":")[0].toLowerCase();
  if (!host || isAppHost(host)) return null;

  const cached = cache.get(host);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.slug;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !key) return null;

  let slug: string | null = null;
  try {
    const endpoint = new URL("/rest/v1/calendars", supabaseUrl);
    endpoint.searchParams.set("select", "slug");
    endpoint.searchParams.set("custom_domain", `eq.${host}`);
    endpoint.searchParams.set("limit", "1");
    const res = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      const rows: unknown = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0] as { slug?: unknown };
        if (typeof row.slug === "string") slug = row.slug;
      }
    }
  } catch {
    slug = null;
  }

  cache.set(host, { slug, at: Date.now() });
  return slug;
}

/** Rutas que siguen siendo de la app aunque se entre por un dominio propio. */
const APP_PATHS = [
  "/api",
  "/auth",
  "/login",
  "/dashboard",
  "/c",
  "/e",
  "/_next",
];

export function shouldRewriteToCalendar(pathname: string): boolean {
  return !APP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
