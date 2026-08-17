"use client";

import { useTransition } from "react";
import { cancelRsvp } from "@/app/actions/registrations";
import { Button } from "@/components/ui/button";

export function RegistrationStatus({
  eventId,
  status,
  qrDataUrl,
}: {
  eventId: string;
  status: string;
  qrDataUrl: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div
        className={
          "rounded-md border px-3 py-2 text-sm " +
          (status === "waitlist"
            ? "border-border bg-muted/40"
            : status === "checked_in"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400")
        }
      >
        {status === "waitlist"
          ? "Estás en lista de espera. Te avisaremos si hay lugar."
          : status === "checked_in"
            ? "Ya acreditado. ¡Bienvenido!"
            : "Tu lugar está confirmado."}
      </div>

      {status !== "waitlist" && qrDataUrl ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border p-4">
          <p className="text-xs text-muted-foreground">
            Muestra este QR en la entrada para el check-in:
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR de check-in"
            width={200}
            height={200}
            className="rounded-lg border border-border bg-white p-2"
          />
        </div>
      ) : null}

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => cancelRsvp(eventId))}
      >
        {pending ? "Cancelando…" : "Cancelar mi registro"}
      </Button>
    </div>
  );
}
