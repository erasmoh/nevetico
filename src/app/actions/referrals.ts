"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Referrals. Cada perfil tiene un código corto único (para URLs limpias:
 * /e/<id>?ref=juandi). Cuando un asistente se registra con un ref_code
 * válido, se inserta una atribución en referral_attributions (vía admin
 * client, bypass RLS). El organizador del evento ve los top referrers.
 */

/** Obtiene o crea el código de referral del usuario actual. */
export async function getOrCreateReferralCode(): Promise<{
  code: string | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { code: null, error: "Debes iniciar sesión." };

  // ¿Ya tiene uno?
  const { data: existing } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (existing) return { code: existing.code };

  // Crear uno: derivar del display_name o email, fallback a 6 chars del id.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  let base = (profile?.display_name ?? user.email ?? user.id)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
  if (!base) base = user.id.slice(0, 6);

  // Asegurar unicidad: si existe, añadir sufijo numérico.
  const admin = createAdminClient();
  let code = base;
  let suffix = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: clash } = await admin
      .from("referral_codes")
      .select("code")
      .eq("code", code)
      .maybeSingle();
    if (!clash) break;
    code = `${base}${suffix++}`;
  }

  const { error } = await admin
    .from("referral_codes")
    .insert({ profile_id: user.id, code });
  if (error) return { code: null, error: error.message };
  return { code };
}

/**
 * Atribuye un registro a un referrer si el ref_code es válido. Se llama
 * desde rsvp() tras crear el registration. Usa admin client (bypass RLS).
 * No falla el RSVP si la atribución falla — es best-effort.
 */
export async function attributeReferral(
  registrationId: string,
  eventId: string,
  refCode: string | null,
): Promise<void> {
  if (!refCode) return;
  const admin = createAdminClient();

  // Buscar el referrer por código.
  const { data: refCodeRow } = await admin
    .from("referral_codes")
    .select("profile_id")
    .eq("code", refCode.toLowerCase())
    .maybeSingle();
  if (!refCodeRow) return;

  // No atribuir si el referrer es el mismo que se registra (self-referral).
  const { data: reg } = await admin
    .from("registrations")
    .select("user_id")
    .eq("id", registrationId)
    .maybeSingle();
  if (reg?.user_id && reg.user_id === refCodeRow.profile_id) return;

  // Insertar atribución (unique por registration_id — si ya existe, ignora).
  await admin.from("referral_attributions").upsert(
    {
      registration_id: registrationId,
      event_id: eventId,
      referrer_id: refCodeRow.profile_id,
      ref_code: refCode.toLowerCase(),
    },
    { onConflict: "registration_id", ignoreDuplicates: true },
  );
}
