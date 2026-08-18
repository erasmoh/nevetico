"use client";

import { useActionState } from "react";
import {
  submitCommunityVerification,
  type VerificationFormState,
} from "@/app/actions/community-verification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Verification = {
  id: string;
  status: "pending" | "approved" | "rejected" | "needs_info";
  form_data: { community_url?: string | null; description?: string | null } | null;
  notes: string | null;
  submitted_at: string;
};

export function VerificationForm({
  calendarId,
  verification,
}: {
  calendarId: string;
  verification?: Verification | null;
}) {
  const [state, action, pending] = useActionState<VerificationFormState, FormData>(
    submitCommunityVerification,
    undefined,
  );

  const status = verification?.status;
  const isApproved = status === "approved";
  const isPending = status === "pending" || status === "needs_info";

  if (isApproved) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
        <span className="size-2 rounded-full bg-green-500" />
        <p className="text-sm">
          Verificación Community aprobada. Tu comunidad lleva el sello
          "Community Plan" en la página pública.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {status === "rejected" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">
            Tu verificación fue rechazada.
            {verification?.notes ? ` Motivo: ${verification.notes}` : ""}
          </p>
        </div>
      )}
      {status === "needs_info" && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
          <p className="text-sm">
            Necesitamos más información.
            {verification?.notes ? ` ${verification.notes}` : ""}
          </p>
        </div>
      )}

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="calendar_id" value={calendarId} />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="community_url">URL de la comunidad (opcional)</Label>
          <Input
            id="community_url"
            name="community_url"
            type="url"
            defaultValue={verification?.form_data?.community_url ?? ""}
            placeholder="https://mi-comunidad.tech"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">
            Cuéntanos sobre tu comunidad
          </Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={verification?.form_data?.description ?? ""}
            rows={4}
            minLength={20}
            maxLength={2000}
            placeholder="¿Qué tipo de eventos organizan? ¿Son gratuitos? ¿Cuántos asistentes suelen tener?"
            required
          />
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="non_commercial"
            value="true"
            required
            className="mt-1 size-4"
          />
          <span>
            Declaro que la comunidad no tiene fines comerciales y los eventos
            son gratuitos o casi gratuitos.
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="accepts_terms"
            value="true"
            required
            className="mt-1 size-4"
          />
          <span>
            Acepto los términos del plan Community y entiendo que Nevetico
            puede revocar el plan si cambia el uso.
          </span>
        </label>

        {state?.error && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
        {state?.errors &&
          Object.entries(state.errors).map(([k, v]) => (
            <p key={k} className="text-sm text-destructive">
              {k}: {v}
            </p>
          ))}

        <Button type="submit" disabled={pending} className="w-fit">
          {pending
            ? "Enviando…"
            : isPending
              ? "Reenviar verificación"
              : "Enviar verificación"}
        </Button>
        {state?.ok && (
          <p className="text-sm text-green-600">
            Verificación enviada. Revisaremos tu solicitud y te avisaremos.
          </p>
        )}
      </form>
    </div>
  );
}
