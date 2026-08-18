"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentsEnabled } from "@/lib/entitlements";
import { isStripeConfigured } from "@/lib/stripe/client";
import {
  getOrCreateExpressAccount,
  createAccountLink,
  createLoginLink,
  syncStripeAccount,
} from "@/lib/stripe/connect";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { headers } from "next/headers";

/**
 * Actions de pagos: Connect (onboarding + dashboard del organizador) y
 * checkout (crear la sesión de Stripe o caer al mock). El toggle global
 * `pricing_enabled` controla todo: si está apagado, createCheckout rechaza.
 */

/** Inicia el onboarding de Stripe Connect Express para el usuario actual. */
export async function connectStripeAccount(): Promise<{ url: string | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "Debes iniciar sesión." };

  if (!isStripeConfigured()) {
    // Sin Stripe configurado, no hay onboarding real. Marcamos una cuenta
    // "demo" para que la UI muestre el estado sin requerir Stripe.
    return { url: null, error: "Stripe no está configurado (modo demo)." };
  }

  const account = await getOrCreateExpressAccount(user.id);
  if (!account) return { url: null, error: "No se pudo crear la cuenta Connect." };

  const h = await headers();
  const origin = h.get("origin") ?? h.get("host") ?? "http://localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = `${proto}://${h.get("host") ?? "localhost:3000"}`;
  const returnUrl = `${base}/dashboard/payments?connect=done`;
  const refreshUrl = `${base}/dashboard/payments?connect=refresh`;

  const url = await createAccountLink(
    account.stripe_account_id,
    returnUrl,
    refreshUrl,
  );
  if (!url) return { url: null, error: "No se pudo crear el enlace de onboarding." };

  // Sincronizamos el estado tras el onboarding (lo hará el return URL).
  return { url };
}

/** Sincroniza el estado de la cuenta Connect desde Stripe. */
export async function refreshStripeAccount(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Debes iniciar sesión." };

  if (!isStripeConfigured()) return { ok: true };

  try {
    await syncStripeAccount(user.id);
    revalidatePath("/dashboard/payments");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Devuelve el link al dashboard Express del organizador. */
export async function getStripeDashboardLink(): Promise<{ url: string | null; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { url: null, error: "Debes iniciar sesión." };

  const { data: account } = await supabase
    .from("stripe_accounts")
    .select("stripe_account_id")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!account) return { url: null, error: "No tienes cuenta Connect." };

  if (!isStripeConfigured()) return { url: null, error: "Stripe no configurado (demo)." };

  const url = await createLoginLink(account.stripe_account_id);
  return { url };
}

export type CheckoutState = {
  ok?: boolean;
  url?: string;
  mock?: boolean;
  orderId?: string;
  error?: string;
} | undefined;

/**
 * Crea una order pending (RPC create_order) + la sesión de checkout.
 * Si Stripe no está configurado o el organizador no tiene cuenta Connect,
 * devuelve { mock: true, orderId } y el cliente pega al mock para confirmar.
 * Si pricing_enabled = false, la RPC rechaza con 'payments_disabled'.
 */
export async function createCheckout(
  _state: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const eventId = formData.get("event_id") as string;
  const ticketTypeId = formData.get("ticket_type_id") as string;
  const email = formData.get("email") as string;
  const name = (formData.get("name") as string | null) ?? null;
  const quantityStr = formData.get("quantity") as string;
  const quantity = Math.max(1, Math.min(10, Number(quantityStr) || 1));
  const couponCode = (formData.get("coupon_code") as string | null) || null;

  const enabled = await paymentsEnabled();
  if (!enabled) {
    return { error: "Los pagos están deshabilitados temporalmente." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Crear la order pending vía RPC.
  const { data: order, error } = await supabase.rpc("create_order", {
    p_event_id: eventId,
    p_ticket_type_id: ticketTypeId,
    p_email: email,
    p_name: name ?? undefined,
    p_quantity: quantity,
    p_user_id: user?.id ?? undefined,
    p_coupon_code: couponCode ?? undefined,
  });
  if (error) {
    const msg = error.message;
    if (msg.includes("payments_disabled")) {
      return { error: "Los pagos están deshabilitados temporalmente." };
    }
    if (msg.includes("event_sold_out")) return { error: "El evento está agotado." };
    if (msg.includes("not_enough_seats")) return { error: "No hay suficientes entradas." };
    if (msg.includes("tier_sold_out")) return { error: "Esta categoría está agotada." };
    if (msg.includes("coupon_not_found")) return { error: "Cupón no válido." };
    if (msg.includes("coupon_expired")) return { error: "El cupón ha expirado." };
    if (msg.includes("coupon_max_uses_reached")) return { error: "El cupón ya se agotó." };
    if (msg.includes("coupon_user_limit_reached")) {
      return { error: "Ya usaste este cupón el máximo de veces." };
    }
    if (msg.includes("sale_not_started")) return { error: "La venta aún no comienza." };
    if (msg.includes("sale_ended")) return { error: "La venta ha terminado." };
    return { error: msg };
  }

  // Leer el título del evento para la sesión de checkout.
  const { data: ev } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .maybeSingle();

  // Buscar la cuenta Connect del organizador.
  let organizerAccountId: string | null = null;
  if (user) {
    const admin = createAdminClient();
    // El organizador es el owner del calendario o el created_by del evento.
    const { data: eventRow } = await admin
      .from("events")
      .select("calendar_id, created_by, calendar:calendars(owner_id)")
      .eq("id", eventId)
      .maybeSingle();
    const organizerId =
      (eventRow as { calendar_id: string | null; created_by: string | null; calendar: { owner_id: string } | null })?.calendar?.owner_id ??
      (eventRow as { created_by: string | null })?.created_by;
    if (organizerId) {
      const { data: stripeAcc } = await admin
        .from("stripe_accounts")
        .select("stripe_account_id")
        .eq("profile_id", organizerId)
        .maybeSingle();
      organizerAccountId = stripeAcc?.stripe_account_id ?? null;
    }
  }

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const { url, sessionId } = await createCheckoutSession(
    order as never,
    ev?.title ?? "Evento",
    organizerAccountId,
    origin,
  );

  if (!url) {
    // Sin Stripe o sin cuenta Connect → mock.
    revalidatePath(`/orders/${(order as { id: string }).id}`);
    return {
      ok: true,
      mock: true,
      orderId: (order as { id: string }).id,
    };
  }

  // Guardar el sessionId en la order para el webhook.
  const admin = createAdminClient();
  await admin
    .from("orders")
    .update({ stripe_checkout_session_id: sessionId })
    .eq("id", (order as { id: string }).id);

  return { ok: true, url, orderId: (order as { id: string }).id };
}
