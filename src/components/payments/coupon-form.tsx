"use client";

import { useActionState } from "react";
import { createCoupon, updateCoupon, type CouponFormState } from "@/app/actions/coupons";
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

type Coupon = {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value_cents: number;
  max_uses: number | null;
  max_uses_per_user: number | null;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
};

export function CouponForm({
  eventId,
  coupon,
  onDone,
}: {
  eventId: string;
  coupon?: Coupon | null;
  onDone?: () => void;
}) {
  const action = coupon ? updateCoupon.bind(null, coupon.id) : createCoupon;
  const [state, formAction, pending] = useActionState<CouponFormState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="event_id" value={eventId} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Código</Label>
          <Input
            id="code"
            name="code"
            defaultValue={coupon?.code ?? ""}
            placeholder="VERANO50"
            required
            style={{ textTransform: "uppercase" }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="kind">Tipo</Label>
          <Select name="kind" defaultValue={coupon?.kind ?? "percent"}>
            <SelectTrigger id="kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Porcentaje (%)</SelectItem>
              <SelectItem value="fixed">Monto fijo (cents)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="value_cents">Valor</Label>
          <Input
            id="value_cents"
            name="value_cents"
            type="number"
            min={1}
            defaultValue={coupon?.value_cents ?? ""}
            placeholder={coupon?.kind === "percent" ? "50 ( = 50%)" : "1000 ( = $10)"}
            required
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="max_uses">Usos máximos (total)</Label>
          <Input
            id="max_uses"
            name="max_uses"
            type="number"
            min={1}
            defaultValue={coupon?.max_uses ?? ""}
            placeholder="ilimitado"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="max_uses_per_user">Usos máx. por usuario</Label>
          <Input
            id="max_uses_per_user"
            name="max_uses_per_user"
            type="number"
            min={1}
            defaultValue={coupon?.max_uses_per_user ?? ""}
            placeholder="ilimitado"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="valid_from">Válido desde</Label>
          <Input
            id="valid_from"
            name="valid_from"
            type="datetime-local"
            defaultValue={coupon?.valid_from ? toLocal(coupon.valid_from) : ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="valid_until">Válido hasta</Label>
          <Input
            id="valid_until"
            name="valid_until"
            type="datetime-local"
            defaultValue={coupon?.valid_until ? toLocal(coupon.valid_until) : ""}
          />
        </div>
      </div>

      {coupon ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="active"
            value="true"
            defaultChecked={coupon.active}
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
          {pending ? "Guardando…" : coupon ? "Actualizar cupón" : "Crear cupón"}
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
