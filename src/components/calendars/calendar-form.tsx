"use client";

import { useActionState } from "react";
import { createCalendar, type CalendarFormState } from "@/app/actions/calendars";
import { slugify } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CalendarForm() {
  const [state, action, pending] = useActionState<CalendarFormState, FormData>(
    createCalendar,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nombre de la comunidad</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Tech Meetup CDMX"
          onBlur={(e) => {
            const slug = document.getElementById("slug") as HTMLInputElement | null;
            if (slug && !slug.value) slug.value = slugify(e.target.value);
          }}
        />
        {state?.errors?.name ? (
          <p className="text-sm text-destructive">{state.errors.name}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="slug">Slug (URL)</Label>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>nevetico.app/c/</span>
          <Input id="slug" name="slug" placeholder="tech-meetup-cdmx" className="flex-1" />
        </div>
        <p className="text-xs text-muted-foreground">
          Solo minúsculas, números y guiones.
        </p>
        {state?.errors?.slug ? (
          <p className="text-sm text-destructive">{state.errors.slug}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descripción (opcional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          placeholder="Comunidad de developers en Ciudad de México."
        />
      </div>

      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Creando…" : "Crear comunidad"}
      </Button>
    </form>
  );
}
