import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enqueueEmail } from "@/lib/email/queue";

/**
 * Mock de checkout para desarrollo sin STRIPE_SECRET_KEY. Simula el webhook
 * `checkout.session.completed`: llama a `confirm_order_payment` con admin
 * client y encola el email de confirmación de ticket. Así se puede probar
 * todo el flujo (order, registration, waitlist, cupones, emails) sin cuenta
 * de Stripe.
 *
 * Uso: GET /api/checkout/mock?order=<order_id>
 * No requiere secret (es solo para dev local; en prod Stripe está configurado
 * y el webhook real hace el trabajo).
 */
export async function GET(req: Request) {
  // Si Stripe está configurado, no se debería usar el mock.
  if (process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe está configurado. Usa el webhook real." },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const orderId = url.searchParams.get("order");
  if (!orderId) {
    return NextResponse.json({ error: "Falta ?order=<id>." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verificar que la order existe y está pending.
  const { data: order } = await admin
    .from("orders")
    .select("id, status, email, name, event_id, quantity")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) {
    return NextResponse.json({ error: "Order no encontrada." }, { status: 404 });
  }
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: `Order no está pending (estado: ${order.status}).` },
      { status: 400 },
    );
  }

  // Simular el webhook: confirmar el pago.
  const { data: result, error } = await admin.rpc("confirm_order_payment", {
    p_order_id: orderId,
    p_stripe_session_id: `mock_session_${orderId}`,
    p_stripe_pi_id: `mock_pi_${orderId}`,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (result as Array<{
    order_id: string;
    event_id: string;
    event_title: string;
    event_slug: string;
    calendar_id: string | null;
    email: string;
    name: string | null;
    registration_ids: string[];
  }>) ?? [];
  const r = rows[0];
  if (!r) {
    return NextResponse.json({ error: "confirm_order_payment no devolvió datos." }, { status: 500 });
  }

  // Encolar email de confirmación de ticket.
  await enqueueEmail({
    template: "ticket_confirmation",
    toEmail: r.email,
    toName: r.name ?? undefined,
    subject: `Tu entrada: ${r.event_title}`,
    eventId: r.event_id,
    calendarId: r.calendar_id ?? undefined,
    payload: {
      event_title: r.event_title,
      event_slug: r.event_slug,
      event_id: r.event_id,
      registration_ids: r.registration_ids,
      order_id: r.order_id,
      quantity: r.registration_ids.length,
    },
  });

  return NextResponse.json({
    ok: true,
    mock: true,
    order_id: r.order_id,
    registration_ids: r.registration_ids,
    redirect: `/orders/${r.order_id}?status=paid`,
  });
}
