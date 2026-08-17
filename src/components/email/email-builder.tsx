"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteCampaign,
  scheduleCampaign,
  sendCampaignNow,
  unscheduleCampaign,
  updateCampaign,
  type CampaignActionState,
  type SendResult,
} from "@/app/actions/campaigns";
import { BLOCK_DEFS, blockDef, blockLabel } from "@/lib/blocks";
import { FieldsEditor } from "@/components/builder/fields-editor";
import { EmailPreview } from "@/components/email/email-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowDown,
  ArrowUp,
  Monitor,
  Plus,
  Send,
  Smartphone,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmailBlock } from "@/lib/email/render";

export type CampaignMetrics = {
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
};

type Block = { type: string; config: Record<string, unknown> };

export function EmailBuilder({
  campaignId,
  calendarSlug,
  initial,
  segments,
  events,
  metrics,
}: {
  campaignId: string;
  calendarSlug: string;
  initial: {
    name: string;
    subject: string;
    preheader: string | null;
    blocks: Block[];
    segmentId: string | null;
    eventId: string | null;
    status: string;
  };
  segments: { id: string; name: string; kind: string }[];
  events: { id: string; title: string; starts_at: string }[];
  metrics: CampaignMetrics | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial.name);
  const [subject, setSubject] = useState(initial.subject);
  const [preheader, setPreheader] = useState(initial.preheader ?? "");
  const [segmentId, setSegmentId] = useState(initial.segmentId ?? "");
  const [eventId, setEventId] = useState(initial.eventId ?? "");
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [scheduleAt, setScheduleAt] = useState("");

  const editable = initial.status === "draft" || initial.status === "scheduled";

  const save = () =>
    startTransition(async () => {
      const r: CampaignActionState = await updateCampaign(
        campaignId,
        undefined,
        { name, subject, preheader, blocks, segmentId: segmentId || null, eventId: eventId || null },
      );
      if (r?.error) toast.error(r.error);
      else toast.success("Campaña guardada");
    });

  const send = () =>
    startTransition(async () => {
      if (!segmentId) {
        toast.error("Elige un segmento antes de enviar.");
        return;
      }
      if (!confirm("¿Enviar la campaña a todos los destinatarios del segmento?")) return;
      const r: SendResult = await sendCampaignNow(campaignId);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(`Campaña enviada: ${r.enqueued ?? 0} emails encolados.`);
        router.refresh();
      }
    });

  const schedule = () =>
    startTransition(async () => {
      if (!scheduleAt) {
        toast.error("Elige fecha y hora.");
        return;
      }
      const iso = new Date(scheduleAt).toISOString();
      const r = await scheduleCampaign(campaignId, iso);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Campaña programada");
        router.refresh();
      }
    });

  const unschedule = () =>
    startTransition(async () => {
      const r = await unscheduleCampaign(campaignId);
      if (r?.error) toast.error(r.error);
      else {
        toast.success("Programación cancelada");
        router.refresh();
      }
    });

  const remove = () =>
    startTransition(async () => {
      if (!confirm("¿Eliminar esta campaña?")) return;
      const r = await deleteCampaign(campaignId);
      if (r?.error) toast.error(r.error);
      else router.push(`/dashboard/calendars/${calendarSlug}/emails`);
    });

  const addBlock = (type: string) => {
    const def = blockDef(type);
    setBlocks([...blocks, { type, config: def?.defaults ?? {} }]);
    setOpenIdx(blocks.length);
  };
  const moveBlock = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
    setOpenIdx(j);
  };
  const updateBlockConfig = (i: number, config: Record<string, unknown>) =>
    setBlocks(blocks.map((b, idx) => (idx === i ? { ...b, config } : b)));
  const deleteBlock = (i: number) => {
    setBlocks(blocks.filter((_, idx) => idx !== i));
    setOpenIdx(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 max-w-md text-lg font-semibold"
            disabled={!editable}
          />
          <div className="flex flex-wrap gap-2">
            {editable ? (
              <Button size="sm" variant="outline" disabled={pending} onClick={save}>
                Guardar
              </Button>
            ) : null}
            {initial.status === "draft" ? (
              <>
                <Button size="sm" disabled={pending} onClick={send}>
                  <Send className="size-4" /> Enviar ahora
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={schedule}
                >
                  Programar
                </Button>
                <Input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="h-9 w-auto"
                />
              </>
            ) : null}
            {initial.status === "scheduled" ? (
              <Button size="sm" variant="outline" disabled={pending} onClick={unschedule}>
                Cancelar programación
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" disabled={pending} onClick={remove}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Estado: <strong>{statusLabel(initial.status)}</strong>
          {initial.status === "sent" && metrics
            ? ` · ${metrics.sent} enviados · ${metrics.opened} abiertos · ${metrics.clicked} clicks`
            : ""}
        </p>
      </div>

      {initial.status === "sent" && metrics ? (
        <div className="grid gap-3 sm:grid-cols-5">
          <Stat label="Enviados" value={metrics.sent} />
          <Stat label="Abiertos" value={metrics.opened} />
          <Stat label="Clicks" value={metrics.clicked} />
          <Stat label="Rebotados" value={metrics.bounced} />
          <Stat label="Bajas" value={metrics.unsubscribed} />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Datos del envío</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="subject">Asunto</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={!editable}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="preheader">Preheader</Label>
                <Input
                  id="preheader"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  disabled={!editable}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="segment">Segmento</Label>
                <select
                  id="segment"
                  value={segmentId}
                  onChange={(e) => setSegmentId(e.target.value)}
                  disabled={!editable}
                  className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                >
                  <option value="">— Elige un segmento —</option>
                  {segments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {segments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No tienes segmentos.{" "}
                    <a
                      href={`/dashboard/calendars/${calendarSlug}/segments`}
                      className="underline"
                    >
                      Crear uno
                    </a>
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="event">Evento asociado (opcional)</Label>
                <select
                  id="event"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  disabled={!editable}
                  className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                >
                  <option value="">— Ninguno —</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Bloques del email</p>
            {blocks.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                Sin bloques. Agrega uno abajo.
              </p>
            ) : null}
            {blocks.map((block, i) => {
              const def = blockDef(block.type);
              const open = openIdx === i;
              return (
                <div key={i} className="rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-1 p-2">
                    <button
                      type="button"
                      onClick={() => setOpenIdx(open ? null : i)}
                      className="min-w-0 flex-1 px-2 py-1 text-left"
                    >
                      <span className="truncate text-sm font-medium">
                        {blockLabel(block.type)}
                      </span>
                    </button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Subir"
                      disabled={!editable || i === 0}
                      onClick={() => moveBlock(i, -1)}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Bajar"
                      disabled={!editable || i === blocks.length - 1}
                      onClick={() => moveBlock(i, 1)}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Eliminar"
                      disabled={!editable}
                      onClick={() => deleteBlock(i)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  {open && def ? (
                    <div className="border-t border-border p-4">
                      <FieldsEditor
                        fields={def.fields}
                        values={block.config}
                        onChange={(cfg) => updateBlockConfig(i, cfg)}
                        idPrefix={`campaign-${campaignId}-${i}`}
                      />
                      <div className="mt-4 flex justify-end">
                        <Button size="sm" disabled={pending} onClick={save}>
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {editable ? (
              <div className="rounded-xl border border-border p-3">
                <p className="mb-2 text-sm font-medium">Agregar bloque</p>
                <div className="grid grid-cols-2 gap-2">
                  {BLOCK_DEFS.map((def) => (
                    <Button
                      key={def.type}
                      type="button"
                      size="sm"
                      variant="outline"
                      className="justify-start"
                      disabled={pending}
                      onClick={() => addBlock(def.type)}
                    >
                      <Plus className="size-4" /> {def.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Vista previa</p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon-sm"
                variant={device === "desktop" ? "secondary" : "ghost"}
                aria-label="Escritorio"
                onClick={() => setDevice("desktop")}
              >
                <Monitor className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant={device === "mobile" ? "secondary" : "ghost"}
                aria-label="Móvil"
                onClick={() => setDevice("mobile")}
              >
                <Smartphone className="size-4" />
              </Button>
            </div>
          </div>
          <EmailPreview
            blocks={blocks as EmailBlock[]}
            subject={subject}
            device={device}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function statusLabel(s: string): string {
  return (
    {
      draft: "Borrador",
      scheduled: "Programada",
      sending: "Enviando",
      sent: "Enviada",
      canceled: "Cancelada",
    } as Record<string, string>
  )[s] ?? s;
}
