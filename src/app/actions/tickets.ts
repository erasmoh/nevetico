"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { paymentsEnabled } from "@/lib/entitlements";
import { z } from "zod";

/**
 * CRUD de ticket_types (tiers). Valida que el organizador sea el dueño del
 * evento y que, si el ticket es pago (price_cents > 0), `paymentsEnabled()`
 * esté encendido y el plan del organizador permita tickets pagos (todos los
 * planes los permiten, pero el flag `paidTicketsAllowed` es el espejo para
 * la UI). Sin `paymentsEnabled`, solo se permiten tickets gratis.
 */

const ticketSchema = z.object({
  event_id: z.uuid(),
  name: z.string().min(1).max(120),
  price_cents: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 0))
    .pipe(z.number().int().min(0)),
  currency: z.string().min(3).max(3).default("USD"),
  capacity: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().positive().nullable()),
  description: z.string().max(2000).optional(),
  sale_start: z.string().optional().or(z.literal("")),
  sale_end: z.string().optional().or(z.literal("")),
  min_per_order: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 1))
    .pipe(z.number().int().min(1)),
  max_per_order: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().positive().nullable()),
  active: z
    .string()
    .optional()
    .transform((v) => v !== "false"),
});

export type TicketFormState = {
  ok?: boolean;
  error?: string;
  errors?: Partial<Record<string, string>>;
} | undefined;

export async function createTicket(
  _state: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const parsed = ticketSchema.safeParse({
    event_id: formData.get("event_id"),
    name: formData.get("name"),
    price_cents: formData.get("price_cents"),
    currency: formData.get("currency") ?? "USD",
    capacity: formData.get("capacity"),
    description: formData.get("description"),
    sale_start: formData.get("sale_start"),
    sale_end: formData.get("sale_end"),
    min_per_order: formData.get("min_per_order"),
    max_per_order: formData.get("max_per_order"),
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

  // Si el ticket es pago, validar que los pagos estén habilitados.
  if (d.price_cents > 0) {
    const enabled = await paymentsEnabled();
    if (!enabled) {
      return { error: "Los tickets pagos están deshabilitados. Actívalos desde el admin." };
    }
  }

  const supabase = await createClient();
  const { data: orderIdx } = await supabase
    .from("ticket_types")
    .select("order_idx")
    .eq("event_id", d.event_id)
    .order("order_idx", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("ticket_types").insert({
    event_id: d.event_id,
    name: d.name,
    price_cents: d.price_cents,
    currency: d.currency,
    capacity: d.capacity,
    description: d.description ?? null,
    sale_start: d.sale_start ? new Date(d.sale_start).toISOString() : null,
    sale_end: d.sale_end ? new Date(d.sale_end).toISOString() : null,
    min_per_order: d.min_per_order,
    max_per_order: d.max_per_order,
    active: d.active,
    order_idx: (orderIdx?.order_idx ?? 0) + 1,
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/events/${d.event_id}`);
  return { ok: true };
}

export async function updateTicket(
  ticketId: string,
  _state: TicketFormState,
  formData: FormData,
): Promise<TicketFormState> {
  const parsed = ticketSchema.safeParse({
    event_id: formData.get("event_id"),
    name: formData.get("name"),
    price_cents: formData.get("price_cents"),
    currency: formData.get("currency") ?? "USD",
    capacity: formData.get("capacity"),
    description: formData.get("description"),
    sale_start: formData.get("sale_start"),
    sale_end: formData.get("sale_end"),
    min_per_order: formData.get("min_per_order"),
    max_per_order: formData.get("max_per_order"),
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

  if (d.price_cents > 0) {
    const enabled = await paymentsEnabled();
    if (!enabled) {
      return { error: "Los tickets pagos están deshabilitados. Actívalos desde el admin." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("ticket_types")
    .update({
      name: d.name,
      price_cents: d.price_cents,
      currency: d.currency,
      capacity: d.capacity,
      description: d.description ?? null,
      sale_start: d.sale_start ? new Date(d.sale_start).toISOString() : null,
      sale_end: d.sale_end ? new Date(d.sale_end).toISOString() : null,
      min_per_order: d.min_per_order,
      max_per_order: d.max_per_order,
      active: d.active,
    })
    .eq("id", ticketId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/events/${d.event_id}`);
  return { ok: true };
}

export async function deleteTicket(ticketId: string, eventId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("ticket_types").delete().eq("id", ticketId);
  revalidatePath(`/dashboard/events/${eventId}`);
}
