import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { paymentsEnabled } from "@/lib/entitlements";
import { TicketForm } from "@/components/payments/ticket-form";
import { CouponForm } from "@/components/payments/coupon-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Ticket, Tag } from "lucide-react";
import { deleteTicket } from "@/app/actions/tickets";
import { deleteCoupon } from "@/app/actions/coupons";

export const metadata = { title: "Tickets y cupones" };

type TicketRow = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  capacity: number | null;
  active: boolean;
  description: string | null;
  sale_start: string | null;
  sale_end: string | null;
  min_per_order: number;
  max_per_order: number | null;
};

type CouponRow = {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value_cents: number;
  max_uses: number | null;
  uses_count: number;
  max_uses_per_user: number | null;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
};

export default async function TicketsPage({
  params,
}: PageProps<"/dashboard/events/[id]/tickets">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, slug, calendar_id")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  const { data: isOrg } = await supabase.rpc("is_event_organizer", { ev_id: id });
  if (!isOrg) notFound();

  const enabled = await paymentsEnabled();

  const { data: tickets } = await supabase
    .from("ticket_types")
    .select(
      "id, name, price_cents, currency, capacity, active, description, sale_start, sale_end, min_per_order, max_per_order",
    )
    .eq("event_id", id)
    .order("order_idx", { ascending: true });

  const { data: coupons } = await supabase
    .from("coupons")
    .select(
      "id, code, kind, value_cents, max_uses, uses_count, max_uses_per_user, valid_from, valid_until, active",
    )
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          render={<Link href={`/dashboard/events/${id}`} />}
        >
          <ArrowLeft className="size-4" /> Volver al evento
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tickets y cupones</h1>
        <p className="text-sm text-muted-foreground">
          {event.title}
          {!enabled && " · Los tickets pagos están deshabilitados (toggle de pricing apagado)."}
        </p>
      </div>

      {/* Tickets / tiers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="size-4" /> Categorías de ticket
          </CardTitle>
          <CardDescription>
            Crea tiers (General, VIP, Early bird…). Los tickets pagos requieren
            que el pricing esté activo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(tickets as TicketRow[] | null)?.length ? (
            <div className="flex flex-col gap-2">
              {(tickets as TicketRow[]).map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t.name}</span>
                      {!t.active && <Badge variant="secondary">inactivo</Badge>}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {t.price_cents === 0
                        ? "Gratis"
                        : `${formatCents(t.price_cents)} ${t.currency}`}
                      {t.capacity ? ` · cupo: ${t.capacity}` : ""}
                    </span>
                  </div>
                  <form action={deleteTicket.bind(null, t.id, id)}>
                    <Button size="sm" variant="ghost" type="submit">
                      Eliminar
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No hay tickets además del RSVP por defecto.
            </p>
          )}

          <div className="border-t border-border pt-4">
            <h3 className="mb-3 text-sm font-medium">Nuevo ticket</h3>
            <TicketForm eventId={id} paymentsEnabled={enabled} />
          </div>
        </CardContent>
      </Card>

      {/* Cupones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="size-4" /> Cupones de descuento
          </CardTitle>
          <CardDescription>
            Crea códigos de descuento para este evento.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {(coupons as CouponRow[] | null)?.length ? (
            <div className="flex flex-col gap-2">
              {(coupons as CouponRow[]).map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{c.code}</span>
                      {!c.active && <Badge variant="secondary">inactivo</Badge>}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {c.kind === "percent"
                        ? `${c.value_cents}% de descuento`
                        : `${formatCents(c.value_cents)} off`}
                      {" · "}
                      {c.uses_count}
                      {c.max_uses ? `/${c.max_uses}` : ""} usos
                    </span>
                  </div>
                  <form action={deleteCoupon.bind(null, c.id, id)}>
                    <Button size="sm" variant="ghost" type="submit">
                      Eliminar
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay cupones.</p>
          )}

          <div className="border-t border-border pt-4">
            <h3 className="mb-3 text-sm font-medium">Nuevo cupón</h3>
            <CouponForm eventId={id} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: "USD",
  });
}
