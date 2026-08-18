import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { handleStripeEvent } from "@/lib/stripe/webhooks";

/**
 * Webhook de Stripe. Valida la firma con STRIPE_WEBHOOK_SECRET y dispatcha
 * a handleStripeEvent. Sin STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET,
 * devuelve 503 (no hay webhooks reales en local; usar el mock).
 *
 * Eventos manejados:
 *  - checkout.session.completed → confirm_order_payment + email
 *  - checkout.session.expired → cancel_order('expired')
 *  - charge.refunded → cancel_order('refunded') + email
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe no configurado. Usa /api/checkout/mock en local." },
      { status: 503 },
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET no configurado." },
      { status: 503 },
    );
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Falta stripe-signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "firma inválida";
    console.error("[stripe/webhook] signature verification failed:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe/webhook] handler failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "handler failed" },
      { status: 500 },
    );
  }
}
