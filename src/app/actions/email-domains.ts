"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  createDomain,
  getDomain,
  verifyDomain,
  deleteDomain as resendDeleteDomain,
  normalizeStatus,
  type ResendRecord,
} from "@/lib/email/resend-domains";
import type { Json } from "@/lib/database.types";

const domainRegex = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

const addSchema = z.object({
  domain: z
    .string()
    .max(253)
    .regex(domainRegex, "Dominio inválido. Ej: eventos.midominio.com")
    .transform((v) => v.toLowerCase()),
});

export type DomainActionState = {
  ok?: boolean;
  error?: string;
  records?: ResendRecord[];
  status?: string;
} | undefined;

async function slugForDomain(
  supabase: Awaited<ReturnType<typeof createClient>>,
  domainId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("verified_domains")
    .select("calendar:calendars(slug)")
    .eq("id", domainId)
    .maybeSingle();
  return (data?.calendar as { slug: string } | null)?.slug ?? null;
}

/** Crea el dominio en Resend y lo registra como 'pending' con sus DNS records. */
export async function addVerifiedDomain(
  calendarSlug: string,
  _state: DomainActionState,
  formData: FormData,
): Promise<DomainActionState> {
  const parsed = addSchema.safeParse({ domain: (formData.get("domain") ?? "").toString().trim() });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dominio inválido." };

  const supabase = await createClient();
  const { data: cal } = await supabase
    .from("calendars")
    .select("id")
    .eq("slug", calendarSlug)
    .maybeSingle();
  if (!cal) return { error: "Comunidad no encontrada." };

  let created;
  try {
    created = await createDomain(parsed.data.domain);
  } catch (err) {
    return { error: `Resend: ${String(err).replace(/^Error:\s*/, "")}` };
  }

  const { error } = await supabase.from("verified_domains").insert({
    calendar_id: cal.id,
    domain: parsed.data.domain,
    status: normalizeStatus(created.status),
    resend_id: created.id,
    records: (created.records ?? []) as unknown as Json,
    last_checked_at: new Date().toISOString(),
  });
  if (error) {
    if (error.code === "23505") return { error: "Ese dominio ya está registrado." };
    return { error: error.message };
  }

  revalidatePath(`/dashboard/calendars/${calendarSlug}/domains`);
  return { ok: true, records: created.records ?? [], status: normalizeStatus(created.status) };
}

/** Reconsulta el estado en Resend (y fuerza verificación DNS). */
export async function checkVerifiedDomain(domainId: string): Promise<DomainActionState> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("verified_domains")
    .select("id, resend_id, domain")
    .eq("id", domainId)
    .maybeSingle();
  if (!row || !row.resend_id) return { error: "Dominio no encontrado." };

  let verified;
  try {
    await verifyDomain(row.resend_id);
    verified = await getDomain(row.resend_id);
  } catch (err) {
    return { error: `Resend: ${String(err).replace(/^Error:\s*/, "")}` };
  }

  const status = normalizeStatus(verified.status);
  const { error } = await supabase
    .from("verified_domains")
    .update({
      status,
      records: (verified.records ?? []) as unknown as Json,
      last_checked_at: new Date().toISOString(),
    })
    .eq("id", domainId);
  if (error) return { error: error.message };

  const slug = await slugForDomain(supabase, domainId);
  if (slug) revalidatePath(`/dashboard/calendars/${slug}/domains`);
  return { ok: true, status, records: verified.records ?? [] };
}

export async function deleteVerifiedDomain(
  domainId: string,
): Promise<DomainActionState> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("verified_domains")
    .select("id, resend_id")
    .eq("id", domainId)
    .maybeSingle();
  if (!row) return { error: "Dominio no encontrado." };

  if (row.resend_id) {
    try {
      await resendDeleteDomain(row.resend_id);
    } catch (err) {
      // Si ya no existe en Resend, seguimos y lo borramos local.
      if (!String(err).includes("not_found")) {
        return { error: `Resend: ${String(err).replace(/^Error:\s*/, "")}` };
      }
    }
  }
  const slug = await slugForDomain(supabase, domainId);
  const { error } = await supabase.from("verified_domains").delete().eq("id", domainId);
  if (error) return { error: error.message };
  if (slug) revalidatePath(`/dashboard/calendars/${slug}/domains`);
  return { ok: true };
}
