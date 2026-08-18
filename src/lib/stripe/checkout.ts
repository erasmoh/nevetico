import "server-only";
import { getStripe } from "./client";
import type { Database } from "@/lib/database.types";

type Order = Database["public"]["Tables"]["orders"]["Row"];

/**
 * Crea una Stripe Checkout Session para una order pending. Usa
 * `application_fee_amount` (lo que se queda Nevetico) y
 * `transfer_data.destination` (la cuenta Connect del organizador).
 *
 * El amount que paga el cliente = unit_price * quantity - discount (los
 * cupones son de Nevetico, no de Stripe, así que el descuento ya va
 * reflejado en el `unit_amount` del line item). El fee = `fee_cents` de la
 * order (calculado en la RPC create_order).
 *
 * Sin STRIPE_SECRET_KEY o sin cuenta Connect del organizador, devuelve
 * { url: null } y el caller debe caer al mock.
 */
export async function createCheckoutSession(
  order: Order,
  eventTitle: string,
  organizerStripeAccountId: string | null,
  origin: string,
): Promise<{ url: string | null; sessionId: string | null }> {
  const stripe = getStripe();
  if (!stripe || !organizerStripeAccountId) {
    return { url: null, sessionId: null };
  }

  // Precio neto por ticket = (subtotal - discount) / quantity, redondeado.
  const subtotal = Number(order.unit_price_cents) * order.quantity;
  const netTotal = subtotal - Number(order.discount_cents);
  const netPerTicket =
    order.quantity > 0
      ? Math.floor(netTotal / order.quantity)
      : Number(order.unit_price_cents);

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: order.quantity,
          price_data: {
            currency: order.currency.toLowerCase(),
            unit_amount: netPerTicket,
            product_data: {
              name: `${eventTitle} — Ticket`,
            },
          },
        },
      ],
      metadata: {
        order_id: order.id,
        event_id: order.event_id,
      },
      success_url: `${origin}/orders/${order.id}?status=paid`,
      cancel_url: `${origin}/orders/${order.id}?status=canceled`,
      payment_intent_data: {
        application_fee_amount: Number(order.fee_cents),
        transfer_data: {
          destination: organizerStripeAccountId,
        },
        metadata: { order_id: order.id },
      },
    },
    { stripeAccount: organizerStripeAccountId },
  );

  return { url: session.url, sessionId: session.id };
}
