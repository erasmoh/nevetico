import "server-only";
import Stripe from "stripe";
import { getStripe } from "./client";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueEmail } from "@/lib/email/queue";

/**
 * Handlers de webhooks de Stripe. Solo se llaman desde
 * `/api/stripe/webhook` (que valida la firma con STRIPE_WEBHOOK_SECRET).
 *
 * - checkout.session.completed → confirm_order_payment + email ticket_confirmation
 * - checkout.session.expired → cancel_order('expired')
 * - charge.refunded → cancel_order('refunded') + email refund
 *
 * Sin STRIPE_SECRET_KEY, el mock `/api/checkout/mock` llama directamente a
 * `confirmOrderPayment` sin pasar por aquí.
 */

type ConfirmResult = {
  order_id: string;
  event_id: string;
  event_title: string;
  event_slug: string;
  calendar_id: string | null;
  email: string;
  name: string | null;
  registration_ids: string[];
};

async function confirmOrderPayment(
  orderId: string,
  sessionId: string | null,
  piId: string | null,
): Promise<ConfirmResult | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("confirm_order_payment", {
    p_order_id: orderId,
    p_stripe_session_id: sessionId ?? undefined,
    p_stripe_pi_id: piId ?? undefined,
  });
  if (error) {
    console.error("[stripe] confirm_order_payment failed:", error.message);
    return null;
  }
  const rows = (data as ConfirmResult[]) ?? [];
  return rows[0] ?? null;
}

async function cancelOrder(orderId: string, newStatus: "expired" | "refunded"): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("cancel_order", {
    p_order_id: orderId,
    p_new_status: newStatus,
  });
  if (error) console.error(`[stripe] cancel_order(${newStatus}) failed:`, error.message);
}

/** Procesa un evento de Stripe y dispatcha al handler correspondiente. */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      if (!orderId) return;
      const result = await confirmOrderPayment(
        orderId,
        session.id,
        session.payment_intent as string | null,
      );
      if (result) {
        await enqueueEmail({
          template: "ticket_confirmation",
          toEmail: result.email,
          toName: result.name ?? undefined,
          subject: `Tu entrada: ${result.event_title}`,
          eventId: result.event_id,
          calendarId: result.calendar_id ?? undefined,
          payload: {
            event_title: result.event_title,
            event_slug: result.event_slug,
            event_id: result.event_id,
            registration_ids: result.registration_ids,
            order_id: result.order_id,
            quantity: result.registration_ids.length,
          },
        });
      }
      break;
    }
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      if (orderId) await cancelOrder(orderId, "expired");
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const orderId = charge.metadata?.order_id;
      if (!orderId) return;
      await cancelOrder(orderId, "refunded");
      const admin = createAdminClient();
      const { data: order } = await admin
        .from("orders")
        .select("event_id, email, name, calendar:events(calendar_id)")
        .eq("id", orderId)
        .maybeSingle();
      if (order) {
        const ev = order as {
          event_id: string;
          email: string;
          name: string | null;
          calendar: { calendar_id: string | null } | null;
        };
        await enqueueEmail({
          template: "refund",
          toEmail: ev.email,
          toName: ev.name ?? undefined,
          subject: "Reembolso procesado",
          eventId: ev.event_id,
          calendarId: ev.calendar?.calendar_id ?? undefined,
          payload: { order_id: orderId },
        });
      }
      break;
    }
    default:
      // Eventos no manejados (no error, solo ignorar).
      break;
  }
}
