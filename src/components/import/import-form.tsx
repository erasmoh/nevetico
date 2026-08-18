"use client";

import { useActionState, useState } from "react";
import { importFromCsv, importFromUrl, type ImportState } from "@/app/actions/import-events";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ImportForm({
  calendarId,
  calendars,
}: {
  calendarId: string | null;
  calendars: { id: string; name: string }[];
}) {
  const [mode, setMode] = useState<"csv" | "url">("csv");
  const csvAction = calendarId ? importFromCsv : importFromCsv;
  const [csvState, csvAction2, csvPending] = useActionState<ImportState, FormData>(
    csvAction,
    undefined,
  );
  const [urlState, urlAction, urlPending] = useActionState<ImportState, FormData>(
    importFromUrl,
    undefined,
  );

  const state = mode === "csv" ? csvState : urlState;
  const pending = mode === "csv" ? csvPending : urlPending;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("csv")}
          className={
            "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors " +
            (mode === "csv"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted/50")
          }
        >
          Pegar CSV
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={
            "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors " +
            (mode === "url"
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:bg-muted/50")
          }
        >
          Importar desde URL
        </button>
      </div>

      {mode === "csv" ? (
        <form action={csvAction2} className="flex flex-col gap-4">
          <input type="hidden" name="calendar_id" value={calendarId ?? ""} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="csv">Pega el contenido del CSV</Label>
            <Textarea
              id="csv"
              name="csv"
              rows={8}
              placeholder={"title,starts_at,description,venue_name,city,timezone\nMeetup Next.js,2026-09-15T18:00:00,Charla sobre RSC,Impact Hub,CDMX,America/Mexico_City"}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Primera fila = headers. Columnas: title, starts_at (ISO 8601),
              description, venue_name, address, city, timezone. Los eventos se
              crean como borrador.
            </p>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Importando…" : "Importar CSV"}
          </Button>
        </form>
      ) : (
        <form action={urlAction} className="flex flex-col gap-4">
          <input type="hidden" name="calendar_id" value={calendarId ?? ""} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="url">URL del evento (Luma, Eventbrite…)</Label>
            <Input
              id="url"
              name="url"
              type="url"
              placeholder="https://lu.ma/abc123 o https://eventbrite.com/e/..."
              required
            />
            <p className="text-xs text-muted-foreground">
              Extrae título, descripción, imagen y fecha (si está disponible).
              Se crea como borrador para que completes el resto.
            </p>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Importando…" : "Importar desde URL"}
          </Button>
        </form>
      )}

      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.ok && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-sm">
          <p className="font-medium text-green-700">
            {state.created} evento(s) importado(s) como borrador.
          </p>
          {state.preview && state.preview.length > 0 && (
            <ul className="mt-2 text-xs text-muted-foreground">
              {state.preview.map((p, i) => (
                <li key={i}>{p.title} — {p.starts_at}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {state?.errors && state.errors.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <p className="font-medium">Algunas filas tuvieron errores:</p>
          <ul className="mt-1 text-xs text-muted-foreground">
            {state.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
