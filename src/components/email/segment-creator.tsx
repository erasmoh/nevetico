"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createSegment,
  previewSegment,
  type SegmentActionState,
  type SegmentPreview,
} from "@/app/actions/segments";
import { SEGMENT_KINDS } from "@/lib/email/segment-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Creador de segmentos con previsualización en vivo (conteo + muestra).
 * Envía vía la server action `createSegment` (que redirige a la lista).
 */
export function SegmentCreator({
  calendarSlug,
  events,
}: {
  calendarSlug: string;
  events: { id: string; title: string; starts_at: string }[];
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>(SEGMENT_KINDS[0].kind);
  const [eventId, setEventId] = useState("");
  const [preview, setPreview] = useState<SegmentPreview | null>(null);
  const [pending, startTransition] = useTransition();

  const createAction = createSegment.bind(null, calendarSlug);
  const [createState, createFormAction] = useActionState<SegmentActionState, FormData>(
    createAction,
    undefined,
  );

  useEffect(() => {
    if (createState?.error) toast.error(createState.error);
  }, [createState]);

  const needsEvent = SEGMENT_KINDS.find((k) => k.kind === kind)?.needsEvent ?? false;

  useEffect(() => {
    if (needsEvent && !eventId) {
      setPreview({ ok: false, count: 0, sample: [], error: "Elige un evento." });
      return;
    }
    const id = setTimeout(() => {
      startTransition(async () => {
        const r = await previewSegment(calendarSlug, kind, eventId || undefined);
        setPreview(r);
      });
    }, 250);
    return () => clearTimeout(id);
  }, [calendarSlug, kind, eventId, needsEvent]);

  return (
    <form action={createFormAction} className="flex flex-col gap-4 rounded-xl border border-border p-4">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="event_id" value={eventId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nombre del segmento</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Confirmados del meetup de agosto"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="kind">Tipo de audiencia</Label>
        <select
          id="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
        >
          {SEGMENT_KINDS.map((k) => (
            <option key={k.kind} value={k.kind}>
              {k.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {SEGMENT_KINDS.find((k) => k.kind === kind)?.description}
        </p>
      </div>

      {needsEvent ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="event_id">Evento</Label>
          <select
            id="event_id"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
            required
          >
            <option value="">— Elige un evento —</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="rounded-lg bg-muted/40 p-3 text-sm">
        {preview ? (
          preview.ok ? (
            <div className="flex flex-col gap-1">
              <p>
                <strong>{preview.count}</strong> destinatario(s).
              </p>
              {preview.sample.length > 0 ? (
                <ul className="text-xs text-muted-foreground">
                  {preview.sample.map((s, i) => (
                    <li key={i}>
                      {s.name ? `${s.name} · ` : ""}
                      {s.email}
                    </li>
                  ))}
                  {preview.count > preview.sample.length ? <li>…</li> : null}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground">{preview.error}</p>
          )
        ) : (
          <p className="text-muted-foreground">Calculando…</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !name.trim()}>
          Crear segmento
        </Button>
      </div>
    </form>
  );
}
