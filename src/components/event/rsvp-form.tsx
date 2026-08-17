"use client";

import { useActionState } from "react";
import { rsvp, type RsvpFormState } from "@/app/actions/registrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RsvpForm({
  eventId,
  user,
}: {
  eventId: string;
  user: { email: string; name: string | null } | null;
}) {
  const [state, action, pending] = useActionState<RsvpFormState, FormData>(
    rsvp,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3" id="rsvp">
      <input type="hidden" name="event_id" value={eventId} />

      {user ? (
        <>
          <input type="hidden" name="email" value={user.email} />
          <input type="hidden" name="name" value={user.name ?? ""} />
          <p className="text-sm text-muted-foreground">
            Registrándote como <strong>{user.name || user.email}</strong>.
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rsvp_name">Nombre</Label>
            <Input id="rsvp_name" name="name" required placeholder="Tu nombre" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rsvp_email">Correo</Label>
            <Input
              id="rsvp_email"
              name="email"
              type="email"
              required
              placeholder="tucorreo@ejemplo.com"
            />
          </div>
        </>
      )}

      {state?.ok ? (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          {state.status === "waitlist"
            ? "Te añadimos a la lista de espera. Te avisaremos si hay lugar."
            : "¡Listo! Tu lugar está reservado. Revisa tu correo para la confirmación."}
        </div>
      ) : null}

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Reservando…" : "Reservar lugar"}
      </Button>
      {user ? null : (
        <p className="text-xs text-muted-foreground">
          ¿Tienes cuenta?{" "}
          <a className="underline-offset-4 hover:underline" href="/login">
            Inicia sesión
          </a>{" "}
          para gestionar tus registros.
        </p>
      )}
    </form>
  );
}
