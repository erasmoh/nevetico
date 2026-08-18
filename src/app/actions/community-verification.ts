"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * Verificación ligera del plan Community. El owner del calendario envía un
 * formulario (url, descripción, declaración sin fines comerciales, acepta
 * términos). El admin revisa (approve/reject/needs_info) desde /admin.
 *
 * RLS: el owner del calendar puede insert/update su fila (no puede cambiar
 * status); el admin lee/escribe todo (vía admin action en admin.ts).
 */

const verificationSchema = z.object({
  calendar_id: z.uuid(),
  community_url: z.string().url().optional().or(z.literal("")),
  description: z.string().min(20).max(2000, "Máximo 2000 caracteres."),
  non_commercial: z.literal("true", "Debes declarar que la comunidad no tiene fines comerciales."),
  accepts_terms: z.literal("true", "Debes aceptar los términos."),
});

export type VerificationFormState = {
  ok?: boolean;
  error?: string;
  errors?: Partial<Record<string, string>>;
} | undefined;

export async function submitCommunityVerification(
  _state: VerificationFormState,
  formData: FormData,
): Promise<VerificationFormState> {
  const parsed = verificationSchema.safeParse({
    calendar_id: formData.get("calendar_id"),
    community_url: formData.get("community_url"),
    description: formData.get("description"),
    non_commercial: formData.get("non_commercial"),
    accepts_terms: formData.get("accepts_terms"),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "_");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión." };

  // Si ya hay una pendiente/needs_info, la actualizamos; si no, insertamos.
  const { data: existing } = await supabase
    .from("community_verifications")
    .select("id, status")
    .eq("calendar_id", d.calendar_id)
    .in("status", ["pending", "needs_info"])
    .maybeSingle();

  const formDataJson = {
    community_url: d.community_url || null,
    description: d.description,
    non_commercial: true,
    accepts_terms: true,
  };

  if (existing) {
    const { error } = await supabase
      .from("community_verifications")
      .update({
        form_data: formDataJson,
        submitted_at: new Date().toISOString(),
        // Si estaba en needs_info, al reenviar vuelve a pending.
        status: existing.status === "needs_info" ? "pending" : existing.status,
      })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("community_verifications").insert({
      calendar_id: d.calendar_id,
      submitted_by: user.id,
      form_data: formDataJson,
      status: "pending",
    });
    if (error) {
      if (error.code === "23505") {
        return { error: "Ya tienes una verificación pendiente." };
      }
      return { error: error.message };
    }
  }

  revalidatePath(`/dashboard/calendars/${d.calendar_id}`);
  return { ok: true };
}
