"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CertificateActionState = { ok?: boolean; error?: string; count?: number } | undefined;

/**
 * Emite certificados para todos los asistentes con check-in de un evento.
 * Crea filas en `certificates` (dedupea por event+email). El token es único
 * y se usa en `/verify/[token]` y en el QR del certificado.
 */
export async function issueCertificates(
  eventId: string,
): Promise<CertificateActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado." };

  const { data: isOrg } = await supabase.rpc("is_event_organizer", {
    ev_id: eventId,
  });
  if (!isOrg) return { error: "No tienes permisos sobre este evento." };

  // Asistentes con check-in.
  const { data: checkedIn } = await supabase
    .from("registrations")
    .select("id, email, name, user_id")
    .eq("event_id", eventId)
    .eq("status", "checked_in");

  const attendees = checkedIn ?? [];
  if (attendees.length === 0) {
    return { error: "No hay asistentes acreditados para certificar." };
  }

  const admin = createAdminClient();

  // Upsert: si ya existe cert para (event, email), no lo duplicamos.
  let count = 0;
  for (const a of attendees) {
    const { error } = await admin.from("certificates").upsert(
      {
        event_id: eventId,
        registration_id: a.id,
        user_id: a.user_id,
        email: a.email,
        name: a.name,
        issued_by: user.id,
      },
      { onConflict: "event_id,email" },
    );
    if (!error) count++;
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  return { ok: true, count };
}
