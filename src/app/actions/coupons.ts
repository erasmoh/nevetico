"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * CRUD de cupones por evento. RLS valida que el usuario sea organizador del
 * evento (policy coupons_* usa is_event_organizer). No se valida
 * paymentsEnabled aquí: un cupón puede crearse aunque los pagos estén
 * apagados (no se podrá usar hasta que se enciendan).
 */

const couponSchema = z.object({
  event_id: z.uuid(),
  code: z.string().min(2).max(40).regex(/^[A-Z0-9_-]+$/i, "Solo letras, números, guiones."),
  kind: z.enum(["percent", "fixed"]),
  value_cents: z
    .string()
    .min(1, "El valor es obligatorio.")
    .transform((v) => Number(v))
    .pipe(z.number().int().positive()),
  max_uses: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().positive().nullable()),
  max_uses_per_user: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().positive().nullable()),
  valid_from: z.string().optional().or(z.literal("")),
  valid_until: z.string().optional().or(z.literal("")),
  active: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
});

export type CouponFormState = {
  ok?: boolean;
  error?: string;
  errors?: Partial<Record<string, string>>;
} | undefined;

export async function createCoupon(
  _state: CouponFormState,
  formData: FormData,
): Promise<CouponFormState> {
  const parsed = couponSchema.safeParse({
    event_id: formData.get("event_id"),
    code: (formData.get("code") as string | null)?.toUpperCase(),
    kind: formData.get("kind"),
    value_cents: formData.get("value_cents"),
    max_uses: formData.get("max_uses"),
    max_uses_per_user: formData.get("max_uses_per_user"),
    valid_from: formData.get("valid_from"),
    valid_until: formData.get("valid_until"),
    active: formData.get("active") ?? "true",
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

  if (d.kind === "percent" && d.value_cents > 100) {
    return { errors: { value_cents: "El porcentaje no puede ser mayor a 100." } };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("coupons").insert({
    event_id: d.event_id,
    code: d.code.toUpperCase(),
    kind: d.kind,
    value_cents: d.value_cents,
    max_uses: d.max_uses,
    max_uses_per_user: d.max_uses_per_user,
    valid_from: d.valid_from ? new Date(d.valid_from).toISOString() : null,
    valid_until: d.valid_until ? new Date(d.valid_until).toISOString() : null,
    active: d.active,
  });
  if (error) {
    if (error.code === "23505") {
      return { errors: { code: "Ya existe un cupón con ese código en este evento." } };
    }
    return { error: error.message };
  }

  revalidatePath(`/dashboard/events/${d.event_id}`);
  return { ok: true };
}

export async function updateCoupon(
  couponId: string,
  _state: CouponFormState,
  formData: FormData,
): Promise<CouponFormState> {
  const parsed = couponSchema.safeParse({
    event_id: formData.get("event_id"),
    code: (formData.get("code") as string | null)?.toUpperCase(),
    kind: formData.get("kind"),
    value_cents: formData.get("value_cents"),
    max_uses: formData.get("max_uses"),
    max_uses_per_user: formData.get("max_uses_per_user"),
    valid_from: formData.get("valid_from"),
    valid_until: formData.get("valid_until"),
    active: formData.get("active") ?? "true",
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

  if (d.kind === "percent" && d.value_cents > 100) {
    return { errors: { value_cents: "El porcentaje no puede ser mayor a 100." } };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("coupons")
    .update({
      code: d.code.toUpperCase(),
      kind: d.kind,
      value_cents: d.value_cents,
      max_uses: d.max_uses,
      max_uses_per_user: d.max_uses_per_user,
      valid_from: d.valid_from ? new Date(d.valid_from).toISOString() : null,
      valid_until: d.valid_until ? new Date(d.valid_until).toISOString() : null,
      active: d.active,
    })
    .eq("id", couponId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/events/${d.event_id}`);
  return { ok: true };
}

export async function deleteCoupon(couponId: string, eventId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("coupons").delete().eq("id", couponId);
  revalidatePath(`/dashboard/events/${eventId}`);
}
