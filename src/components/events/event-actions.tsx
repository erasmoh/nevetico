"use client";

import { useTransition } from "react";
import { setEventStatus } from "@/app/actions/events";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function EventActions({
  eventId,
  status,
  publicUrl,
}: {
  eventId: string;
  status: string;
  publicUrl?: string;
}) {
  const [pending, startTransition] = useTransition();

  const run = (next: "published" | "canceled" | "draft", label: string) =>
    startTransition(async () => {
      await setEventStatus(eventId, next);
      toast.success(label);
    });

  return (
    <div className="flex flex-wrap gap-2">
      {status === "draft" ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run("published", "Evento publicado")}
        >
          Publicar
        </Button>
      ) : null}
      {status === "published" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run("canceled", "Evento cancelado")}
        >
          Cancelar evento
        </Button>
      ) : null}
      {status === "canceled" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run("draft", "Evento reabierto como borrador")}
        >
          Reabrir como borrador
        </Button>
      ) : null}
      {publicUrl ? (
        <Button size="sm" variant="ghost" nativeButton={false} render={<a href={publicUrl} target="_blank" rel="noreferrer" />}>
          Ver página pública
        </Button>
      ) : null}
    </div>
  );
}
