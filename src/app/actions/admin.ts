"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/entitlements";

/**
 * Acciones del panel de admin (gated por `profiles.is_admin`). Cada una
 * verifica que el usuario autenticado tenga `is_admin = true` antes de
 * mutar; las mutaciones van con el admin client (bypass RLS).
 */

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?from=admin");
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect("/dashboard");
  return user.id;
}

const planSchema = z.enum(["community", "pro", "business"]);
const overrideSchema = z
  .number()
  .int()
  .positive()
  .max(1_000_000)
  .nullable();

export type AdminActionState = { ok?: boolean; error?: string } | undefined;

/** Cambia el plan de un perfil. */
export async function setProfilePlan(
  profileId: string,
  plan: Plan,
): Promise<AdminActionState> {
  const parsed = planSchema.safeParse(plan);
  if (!parsed.success) return { error: "Plan inválido." };
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ plan: parsed.data })
    .eq("id", profileId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

/** Setea el override de asistentes de un perfil (null = hereda del plan). */
export async function setProfileAttendeesOverride(
  profileId: string,
  override: number | null,
): Promise<AdminActionState> {
  const parsed = overrideSchema.safeParse(override);
  if (!parsed.success) return { error: "Override inválido." };
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ max_attendees_override: parsed.data })
    .eq("id", profileId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

/** Setea el override de asistentes de un evento (null = hereda del plan/perfil). */
export async function setEventAttendeesOverride(
  eventId: string,
  override: number | null,
): Promise<AdminActionState> {
  const parsed = overrideSchema.safeParse(override);
  if (!parsed.success) return { error: "Override inválido." };
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({ max_attendees_override: parsed.data })
    .eq("id", eventId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

/** Concede o revoca is_admin a un perfil. */
export async function setProfileIsAdmin(
  profileId: string,
  isAdmin: boolean,
): Promise<AdminActionState> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_admin: isAdmin })
    .eq("id", profileId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

/** Toggle global del pricing. false = todo fluye como Pro (sin gating). */
export async function setPricingEnabled(
  enabled: boolean,
): Promise<AdminActionState> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("app_settings")
    .update({ value: { pricing_enabled: enabled } })
    .eq("key", "pricing_enabled");
  if (error) {
    if (error.code === "PGRST116" || error.code === "22P02") {
      // La fila no existe (reset sin seed del setting); la creamos.
      const { error: insErr } = await admin.from("app_settings").insert({
        key: "pricing_enabled",
        value: { pricing_enabled: enabled },
      });
      if (insErr) return { error: insErr.message };
    } else {
      return { error: error.message };
    }
  }
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

const reviewStatusSchema = z.enum(["approved", "rejected", "needs_info"]);

/** Revisa una verificación de plan Community (approve/reject/needs_info). */
export async function reviewCommunityVerification(
  verificationId: string,
  status: "approved" | "rejected" | "needs_info",
  notes?: string,
): Promise<AdminActionState> {
  const parsed = reviewStatusSchema.safeParse(status);
  if (!parsed.success) return { error: "Estado inválido." };
  const adminId = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("community_verifications")
    .update({
      status: parsed.data,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      notes: notes ?? null,
    })
    .eq("id", verificationId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}
