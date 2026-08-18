"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { z } from "zod";

/**
 * Importador de eventos desde CSV o URL de Luma/Eventbrite.
 *
 * CSV: el organizador sube un CSV con columnas title, starts_at (ISO),
 * description, venue_name, address, city, timezone (default UTC). El
 * separador es coma; la primera fila es el header. Se crea cada evento
 * con la RPC create_event (valida permisos) + update para city/topic.
 *
 * URL: fetch del HTML de la página del evento y extracción de OG meta
 * tags (og:title, og:description, og:image) + JSON-LD si existe. Funciona
 * para Luma y Eventbrite (ambos tienen OG tags). El organizador revisa y
 * ajusta antes de publicar (se crea como draft).
 */

const csvRowSchema = z.object({
  title: z.string().min(2).max(120),
  starts_at: z.string().min(1),
  ends_at: z.string().optional(),
  description: z.string().max(5000).optional(),
  venue_name: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(120).optional(),
  timezone: z.string().default("UTC"),
});

export type ImportState = {
  ok?: boolean;
  created?: number;
  errors?: string[];
  error?: string;
  preview?: { title: string; starts_at: string }[];
} | undefined;

/** Parsea un CSV simple (comas, primera fila = header). */
function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = cells[j] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

/** Importa eventos desde un CSV. */
export async function importFromCsv(
  _state: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const calendarId = (formData.get("calendar_id") as string | null) || null;
  const csv = formData.get("csv") as string | null;

  if (!csv) return { error: "Pega el contenido del CSV." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión." };

  // Validar que el usuario pueda crear eventos en el calendar (si viene).
  if (calendarId) {
    const { data: member } = await supabase
      .from("calendar_members")
      .select("role")
      .eq("calendar_id", calendarId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member || !["owner", "host"].includes(member.role)) {
      return { error: "No tienes permisos en esta comunidad." };
    }
  }

  const rows = parseCsv(csv);
  if (rows.length === 0) return { error: "El CSV no tiene filas." };

  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const parsed = csvRowSchema.safeParse({
      title: row.title || row.titulo,
      starts_at: row.starts_at || row.fecha,
      ends_at: row.ends_at,
      description: row.description || row.descripcion,
      venue_name: row.venue_name || row.lugar,
      address: row.address || row.direccion,
      city: row.city || row.ciudad,
      timezone: row.timezone || row.tz || "UTC",
    });
    if (!parsed.success) {
      errors.push(`Fila ${i + 2}: ${parsed.error.issues[0]?.message ?? "inválida"}`);
      continue;
    }
    const d = parsed.data;

    const slug = slugify(d.title);
    const { data: event, error } = await supabase.rpc("create_event", {
      p_calendar_id: (calendarId ?? null) as string,
      p_slug: `${slug}-${Date.now().toString(36).slice(-4)}`,
      p_title: d.title,
      p_starts_at: d.starts_at,
      p_ends_at: d.ends_at ?? undefined,
      p_description: d.description ?? undefined,
      p_timezone: d.timezone,
      p_status: "draft",
    });
    if (error) {
      errors.push(`Fila ${i + 2} (${d.title}): ${error.message}`);
      continue;
    }
    // Setear city si viene.
    if (d.city && event) {
      await supabase.from("events").update({ city: d.city }).eq("id", event.id);
    }
    created++;
  }

  if (calendarId) revalidatePath(`/dashboard/calendars/${calendarId}`);
  revalidatePath("/dashboard");
  return { ok: true, created, errors };
}

/** Extrae datos de un evento desde una URL (Luma/Eventbrite) via OG tags. */
export async function importFromUrl(
  _state: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const calendarId = (formData.get("calendar_id") as string | null) || null;
  const url = formData.get("url") as string | null;

  if (!url) return { error: "Pega una URL." };

  const urlSchema = z.url();
  if (!urlSchema.safeParse(url).success) {
    return { error: "URL no válida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión." };

  if (calendarId) {
    const { data: member } = await supabase
      .from("calendar_members")
      .select("role")
      .eq("calendar_id", calendarId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!member || !["owner", "host"].includes(member.role)) {
      return { error: "No tienes permisos en esta comunidad." };
    }
  }

  // Fetch del HTML y extraer OG tags + JSON-LD.
  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NeveticoImporter/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { error: `No se pudo cargar la URL (HTTP ${res.status}).` };
    html = await res.text();
  } catch {
    return { error: "No se pudo acceder a la URL. Verifica que sea pública." };
  }

  const ogTitle = extractMeta(html, "og:title") ?? extractTag(html, "title");
  const ogDescription = extractMeta(html, "og:description");
  const ogImage = extractMeta(html, "og:image");

  // Intentar extraer fecha desde JSON-LD (schema.org/Event).
  const jsonLdDate = extractJsonLdEventDate(html);

  if (!ogTitle) {
    return { error: "No se pudieron extraer datos del evento de la URL." };
  }

  // Crear como draft con los datos extraídos; el organizador completa el resto.
  const slug = `${slugify(ogTitle)}-${Date.now().toString(36).slice(-4)}`;
  const { data: event, error } = await supabase.rpc("create_event", {
    p_calendar_id: (calendarId ?? null) as string,
    p_slug: slug,
    p_title: ogTitle.slice(0, 120),
    p_starts_at: jsonLdDate ?? new Date(Date.now() + 7 * 86400_000).toISOString(),
    p_description: ogDescription?.slice(0, 5000) ?? undefined,
    p_cover_url: ogImage ?? undefined,
    p_status: "draft",
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return {
    ok: true,
    created: 1,
    preview: [{ title: ogTitle, starts_at: jsonLdDate ?? "(por confirmar)" }],
  };
}

function extractMeta(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    "i",
  );
  const m = html.match(re);
  return m?.[1] ?? null;
}

function extractTag(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i");
  const m = html.match(re);
  return m?.[1]?.trim() ?? null;
}

function extractJsonLdEventDate(html: string): string | null {
  const blocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!blocks) return null;
  for (const block of blocks) {
    const json = block.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, "");
    try {
      const parsed = JSON.parse(json);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item["@type"] === "Event" && item.startDate) {
          return item.startDate;
        }
        // @graph (común en WordPress/Eventbrite)
        if (item["@graph"] && Array.isArray(item["@graph"])) {
          for (const g of item["@graph"]) {
            if (g["@type"] === "Event" && g.startDate) return g.startDate;
          }
        }
      }
    } catch {
      // JSON-LD inválido, ignorar.
    }
  }
  return null;
}
