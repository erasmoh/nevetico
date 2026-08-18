import "server-only";
import Stripe from "stripe";

/**
 * Cliente Stripe singleton. Si `STRIPE_SECRET_KEY` no está configurado,
 * `getStripe()` devuelve null y el flujo de pagos cae al stub mock (igual que
 * `RESEND_API_KEY` con los emails). Así se puede desarrollar todo el flujo de
 * orders/registrations/emails/cupones en local sin cuenta de Stripe.
 *
 * El webhook valida la firma solo si hay `STRIPE_WEBHOOK_SECRET`; sin él,
 * la route `/api/checkout/mock` simula el pago llamando a
 * `confirm_order_payment` con admin client.
 */
let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    cached = null;
    return null;
  }
  cached = new Stripe(key, {
    // Stripe Connect necesita apiVersion estable; usamos la del SDK.
    typescript: true,
  });
  return cached;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}
