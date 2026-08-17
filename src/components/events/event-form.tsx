"use client";

import { useActionState, useState } from "react";
import { createEvent, type EventFormState } from "@/app/actions/events";
import { slugify } from "@/lib/slug";
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
import { Users, User } from "lucide-react";

export function EventForm({
  calendars,
  defaultTimezone,
}: {
  calendars: { id: string; name: string }[];
  defaultTimezone: string;
}) {
  const [state, action, pending] = useActionState<EventFormState, FormData>(
    createEvent,
    undefined,
  );
  // "community" | "personal". Personal solo se ofrece si el usuario tiene
  // comunidades (si no, todo evento es personal de facto).
  const [scope, setScope] = useState<"community" | "personal">(
    calendars.length > 0 ? "community" : "personal",
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="timezone" value={defaultTimezone} />

      {/* Tipo de evento: comunidad o personal */}
      <div className="flex flex-col gap-2">
        <Label>Tipo de evento</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setScope("community")}
            disabled={calendars.length === 0}
            className={
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors " +
              (scope === "community"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted/50")
            }
          >
            <Users className="size-4" /> De una comunidad
          </button>
          <button
            type="button"
            onClick={() => setScope("personal")}
            className={
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors " +
              (scope === "personal"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted/50")
            }
          >
            <User className="size-4" /> Personal
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {scope === "community"
            ? "El evento se publica dentro de una comunidad y aparece en su calendario."
            : "Un evento tuyo, sin comunidad. Se comparte con un enlace directo."}
        </p>
      </div>

      {/* Selector de comunidad (solo si scope = community) */}
      {scope === "community" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="calendar_id">Comunidad</Label>
          <Select name="calendar_id" required>
            <SelectTrigger id="calendar_id">
              <SelectValue placeholder="Selecciona una comunidad" />
            </SelectTrigger>
            <SelectContent>
              {calendars.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.errors?.calendar_id ? (
            <p className="text-sm text-destructive">{state.errors.calendar_id}</p>
          ) : null}
        </div>
      ) : (
        // Evento personal: no mandamos calendar_id (la action lo trata como null).
        <input type="hidden" name="calendar_id" value="" />
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Título del evento</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Tech Meetup CDMX — Agosto 2026"
          onBlur={(e) => {
            const slug = document.getElementById("slug") as HTMLInputElement | null;
            if (slug && !slug.value) slug.value = slugify(e.target.value);
          }}
        />
        {state?.errors?.title ? (
          <p className="text-sm text-destructive">{state.errors.title}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input id="slug" name="slug" placeholder="meetup-agosto-2026" />
        <p className="text-xs text-muted-foreground">
          Se autogenera del título si lo dejas vacío.
        </p>
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
          placeholder="Una noche de charlas sobre Next.js, Supabase e IA."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="starts_at">Inicio</Label>
          <Input id="starts_at" name="starts_at" type="datetime-local" required />
          <p className="text-xs text-muted-foreground">
            Hora en la zona del evento ({defaultTimezone}).
          </p>
          {state?.errors?.starts_at ? (
            <p className="text-sm text-destructive">{state.errors.starts_at}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ends_at">Fin (opcional)</Label>
          <Input id="ends_at" name="ends_at" type="datetime-local" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="location_type">Modalidad</Label>
        <Select name="location_type" defaultValue="in_person">
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
          <Input id="venue_name" name="venue_name" placeholder="Impact Hub CDMX" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" name="address" placeholder="Av. Reforma 123, CDMX" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="online_url">URL en línea (opcional)</Label>
          <Input
            id="online_url"
            name="online_url"
            type="url"
            placeholder="https://meet.google.com/..."
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="capacity">Cupo (opcional)</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            placeholder="Ilimitado"
          />
          <p className="text-xs text-muted-foreground">
            Vacío = sin límite. Al llenarse, los RSVP pasan a lista de espera.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="status">Estado</Label>
        <Select name="status" defaultValue="draft">
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Borrador (no visible)</SelectItem>
            <SelectItem value="published">Publicado (visible)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Creando…" : "Crear evento"}
      </Button>
    </form>
  );
}
