"use client";

import { useActionState, useState } from "react";
import { createCheckout, type CheckoutState } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TicketType = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  capacity: number | null;
  description: string | null;
  min_per_order: number;
  max_per_order: number | null;
};

type UserProfile = { email: string; name: string | null } | null;

export function TicketCheckout({
  eventId,
  tickets,
  user,
}: {
  eventId: string;
  tickets: TicketType[];
  user: UserProfile;
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(
    createCheckout,
    undefined,
  );
  const [selectedTicket, setSelectedTicket] = useState(tickets[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);

  const ticket = tickets.find((t) => t.id === selectedTicket) ?? tickets[0];
  if (!ticket) return null;

  const maxQty = ticket.max_per_order ?? 10;
  const minQty = ticket.min_per_order;
  const total = ticket.price_cents * quantity;

  // Si la action devolvió una URL de Stripe, redirigir.
  if (state?.url) {
    window.location.href = state.url;
  }

  // Si la action devolvió mock, redirigir al mock.
  if (state?.mock && state.orderId) {
    window.location.href = `/api/checkout/mock?order=${state.orderId}`;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="ticket_type_id" value={selectedTicket} />

      {tickets.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket">Categoría</Label>
          <Select
            value={selectedTicket}
            onValueChange={(v) => setSelectedTicket(v ?? "")}
          >
            <SelectTrigger id="ticket">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tickets.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} — {formatCents(t.price_cents, t.currency)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {ticket.description && (
            <p className="text-xs text-muted-foreground">{ticket.description}</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="quantity">Cantidad</Label>
        <Select
          value={String(quantity)}
          onValueChange={(v) => setQuantity(Number(v ?? 1))}
        >
          <SelectTrigger id="quantity">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from(
              { length: Math.min(maxQty, 10) - minQty + 1 },
              (_, i) => i + minQty,
            ).map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={user?.email ?? ""}
          required
          disabled={!!user}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nombre (opcional)</Label>
        <Input
          id="name"
          name="name"
          defaultValue={user?.name ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="coupon_code">Cupón (opcional)</Label>
        <Input
          id="coupon_code"
          name="coupon_code"
          placeholder="VERANO50"
          style={{ textTransform: "uppercase" }}
        />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">Total</span>
        <span className="text-lg font-semibold">
          {formatCents(total, ticket.currency)}
        </span>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Procesando…" : `Comprar ${quantity} entrada(s)`}
      </Button>

      <p className="text-xs text-muted-foreground">
        Serás redirigido a Stripe para completar el pago de forma segura.
      </p>
    </form>
  );
}

function formatCents(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("es-MX", {
    style: "currency",
    currency: currency || "USD",
  });
}
