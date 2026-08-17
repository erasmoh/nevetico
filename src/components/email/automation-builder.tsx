"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  deleteAutomation,
  toggleAutomation,
  updateAutomation,
} from "@/app/actions/automations";
import { AUTOMATION_TRIGGERS, STEP_TYPES, type StepType } from "@/lib/email/automation-types";
import { BlocksEditor } from "@/components/email/blocks-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

type Step = {
  type: StepType;
  subject?: string;
  blocks?: { type: string; config: Record<string, unknown> }[];
  delay_minutes?: number;
};

export function AutomationBuilder({
  automationId,
  calendarSlug,
  initial,
}: {
  automationId: string;
  calendarSlug: string;
  initial: { name: string; trigger: string; enabled: boolean; steps: Step[] };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial.name);
  const [trigger, setTrigger] = useState(initial.trigger);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [steps, setSteps] = useState<Step[]>(initial.steps);

  const save = () =>
    startTransition(async () => {
      const r = await updateAutomation(automationId, {
        name,
        trigger,
        enabled,
        config: {},
        steps: steps as unknown[],
      });
      if (r?.error) toast.error(r.error);
      else toast.success("Automatización guardada");
    });

  const toggle = () =>
    startTransition(async () => {
      const next = !enabled;
      setEnabled(next);
      const r = await toggleAutomation(automationId, next);
      if (r?.error) {
        setEnabled(!next);
        toast.error(r.error);
      } else toast.success(next ? "Activada" : "Pausada");
    });

  const remove = () =>
    startTransition(async () => {
      if (!confirm("¿Eliminar esta automatización?")) return;
      const r = await deleteAutomation(automationId);
      if (r?.error) toast.error(r.error);
      else router.push(`/dashboard/calendars/${calendarSlug}/automations`);
    });

  const addStep = (type: StepType) => {
    const step: Step =
      type === "send_email"
        ? { type, subject: "", blocks: [] }
        : { type, delay_minutes: 60 };
    setSteps([...steps, step]);
  };
  const updateStep = (i: number, patch: Partial<Step>) =>
    setSteps(steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    setSteps(next);
  };

  const triggerDesc = AUTOMATION_TRIGGERS.find((t) => t.id === trigger)?.description;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 max-w-md text-lg font-semibold"
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={enabled ? "default" : "outline"} disabled={pending} onClick={toggle}>
            {enabled ? "Activa" : "Pausada"}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={save}>
            Guardar
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={remove}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
        <Label htmlFor="trigger">Disparador</Label>
        <select
          id="trigger"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          className="h-9 w-full max-w-md rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
        >
          {AUTOMATION_TRIGGERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        {triggerDesc ? <p className="text-xs text-muted-foreground">{triggerDesc}</p> : null}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Pasos</p>
        {steps.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Sin pasos. Agrega uno abajo.
          </p>
        ) : null}
        {steps.map((step, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                {i + 1}
              </span>
              <span className="text-sm font-medium">
                {STEP_TYPES.find((t) => t.id === step.type)?.label ?? step.type}
              </span>
              <div className="ml-auto flex gap-1">
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Subir" disabled={i === 0} onClick={() => moveStep(i, -1)}>
                  <ArrowUp className="size-4" />
                </Button>
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Bajar" disabled={i === steps.length - 1} onClick={() => moveStep(i, 1)}>
                  <ArrowDown className="size-4" />
                </Button>
                <Button type="button" size="icon-sm" variant="ghost" aria-label="Eliminar" onClick={() => removeStep(i)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>

            {step.type === "wait" ? (
              <div className="flex items-center gap-2">
                <Label htmlFor={`delay-${i}`} className="text-xs">
                  Esperar
                </Label>
                <Input
                  id={`delay-${i}`}
                  type="number"
                  min={0}
                  value={step.delay_minutes ?? 0}
                  onChange={(e) => updateStep(i, { delay_minutes: Number(e.target.value) })}
                  className="h-8 w-24"
                />
                <span className="text-xs text-muted-foreground">minutos</span>
              </div>
            ) : null}

            {step.type === "send_email" ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`subject-${i}`} className="text-xs">
                    Asunto
                  </Label>
                  <Input
                    id={`subject-${i}`}
                    value={step.subject ?? ""}
                    onChange={(e) => updateStep(i, { subject: e.target.value })}
                  />
                </div>
                <BlocksEditor
                  blocks={step.blocks ?? []}
                  onChange={(b) => updateStep(i, { blocks: b })}
                  idPrefix={`auto-${automationId}-${i}`}
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor={`sdelay-${i}`} className="text-xs">
                    Retrasar
                  </Label>
                  <Input
                    id={`sdelay-${i}`}
                    type="number"
                    min={0}
                    value={step.delay_minutes ?? 0}
                    onChange={(e) => updateStep(i, { delay_minutes: Number(e.target.value) })}
                    className="h-8 w-24"
                  />
                  <span className="text-xs text-muted-foreground">
                    minutos desde el disparo
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          {STEP_TYPES.map((t) => (
            <Button key={t.id} type="button" size="sm" variant="outline" onClick={() => addStep(t.id)}>
              <Plus className="size-4" /> {t.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
