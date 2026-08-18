"use client";

import { useActionState } from "react";
import { createTicket, updateTicket, type TicketFormState } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Ticket = {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  capacity: number | null;
  description: string | null;
  sale_start: string | null;
  sale_end: string | null;
  min_per_order: number;
  max_per_order: number | null;
  active: boolean;
};

export function TicketForm({
  eventId,
  ticket,
  paymentsEnabled,
  onDone,
}: {
  eventId: string;
  ticket?: Ticket | null;
  paymentsEnabled: boolean;
  onDone?: () => void;
}) {
  const action = ticket
    ? updateTicket.bind(null, ticket.id)
    : createTicket;
  const [state, formAction, pending] = useActionState<TicketFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="event_id" value={eventId} />
      {ticket ? <input type="hidden" name="active" value={ticket.active ? "true" : "false"} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Nombre del ticket</Label>
          <Input
            id="name"
            name="name"
            defaultValue={ticket?.name ?? ""}
            placeholder="General, VIP, Early bird…"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price_cents">Precio (cents)</Label>
          <Input
            id="price_cents"
            name="price_cents"
            type="number"
            min={0}
            defaultValue={ticket?.price_cents ?? 0}
            placeholder="0 = gratis"
            disabled={!paymentsEnabled && !ticket?.price_cents}
          />
          {!paymentsEnabled && (
            <p className="text-xs text-muted-foreground">
              Los tickets pagos están deshabilitados (toggle de pricing apagado).
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="capacity">Cupo (opcional)</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            defaultValue={ticket?.capacity ?? ""}
            placeholder="ilimitado"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="min_per_order">Mín. por orden</Label>
          <Input
            id="min_per_order"
            name="min_per_order"
            type="number"
            min={1}
            defaultValue={ticket?.min_per_order ?? 1}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="max_per_order">Máx. por orden</Label>
          <Input
            id="max_per_order"
            name="max_per_order"
            type="number"
            min={1}
            defaultValue={ticket?.max_per_order ?? ""}
            placeholder="ilimitado"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sale_start">Venta inicia</Label>
          <Input
            id="sale_start"
            name="sale_start"
            type="datetime-local"
            defaultValue={ticket?.sale_start ? toLocal(ticket.sale_start) : ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sale_end">Venta termina</Label>
          <Input
            id="sale_end"
            name="sale_end"
            type="datetime-local"
            defaultValue={ticket?.sale_end ? toLocal(ticket.sale_end) : ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={ticket?.description ?? ""}
          rows={2}
          maxLength={2000}
        />
      </div>

      {ticket ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked={ticket.active}
            className="size-4"
          />
          Activo
        </label>
      ) : null}

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.errors &&
        Object.entries(state.errors).map(([k, v]) => (
          <p key={k} className="text-sm text-destructive">
            {k}: {v}
          </p>
        ))}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : ticket ? "Actualizar" : "Crear ticket"}
        </Button>
        {onDone && (
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

function toLocal(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}
