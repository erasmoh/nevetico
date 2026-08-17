"use client";

import { useActionState } from "react";
import { updateEvent, type EventFormState } from "@/app/actions/events";
import { toDatetimeLocalInput } from "@/lib/datetime";
import { TIMEZONES } from "@/lib/timezones";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function EventEditForm({
  eventId,
  event,
}: {
  eventId: string;
  event: {
    calendar_id: string | null;
    title: string;
    slug: string;
    description: string | null;
    cover_url: string | null;
    starts_at: string;
    ends_at: string | null;
    timezone: string;
    location_type: string;
    venue_name: string | null;
    address: string | null;
    online_url: string | null;
    capacity: number | null;
    status: string;
  };
}) {
  const [state, action, pending] = useActionState<EventFormState, FormData>(
    (_state, formData) => updateEvent(eventId, _state, formData),
    undefined,
  );

  const capacityValue = event.capacity ?? "";

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="calendar_id" value={event.calendar_id ?? ""} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Título</Label>
        <Input id="title" name="title" required defaultValue={event.title} />
        {state?.errors?.title ? (
          <p className="text-sm text-destructive">{state.errors.title}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={event.slug} />
        {state?.errors?.slug ? (
          <p className="text-sm text-destructive">{state.errors.slug}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={event.description ?? ""}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cover_url">Portada (URL de imagen cuadrada) *</Label>
        <Input
          id="cover_url"
          name="cover_url"
          type="url"
          required
          defaultValue={event.cover_url ?? ""}
          placeholder="https://…/portada.jpg"
        />
        <p className="text-xs text-muted-foreground">
          Imagen cuadrada (recomendado 1200x1200). Aparece al compartir el
          evento en redes y en la imagen de IG Stories.
        </p>
        {state?.errors?.cover_url ? (
          <p className="text-sm text-destructive">{state.errors.cover_url}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="starts_at">Inicio</Label>
          <Input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={toDatetimeLocalInput(event.starts_at, event.timezone)}
          />
          {state?.errors?.starts_at ? (
            <p className="text-sm text-destructive">{state.errors.starts_at}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ends_at">Fin</Label>
          <Input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            defaultValue={
              event.ends_at ? toDatetimeLocalInput(event.ends_at, event.timezone) : ""
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="timezone">Zona horaria</Label>
        <Select name="timezone" defaultValue={event.timezone}>
          <SelectTrigger id="timezone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="location_type">Modalidad</Label>
        <Select name="location_type" defaultValue={event.location_type}>
          <SelectTrigger id="location_type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_person">Presencial</SelectItem>
            <SelectItem value="online">En línea</SelectItem>
            <SelectItem value="hybrid">Híbrido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="venue_name">Lugar / sede</Label>
          <Input id="venue_name" name="venue_name" defaultValue={event.venue_name ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" name="address" defaultValue={event.address ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="online_url">URL en línea</Label>
          <Input id="online_url" name="online_url" type="url" defaultValue={event.online_url ?? ""} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="capacity">Cupo</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            defaultValue={capacityValue}
            placeholder="Ilimitado"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="status">Estado</Label>
        <Select name="status" defaultValue={event.status}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="published">Publicado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </form>
  );
}
