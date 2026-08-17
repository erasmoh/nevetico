"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { createAutomation, type AutomationActionState } from "@/app/actions/automations";
import { AUTOMATION_TRIGGERS } from "@/lib/email/automation-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Alta de automatización: disparador + nombre. Redirige al editor. */
export function AutomationCreator({ calendarSlug }: { calendarSlug: string }) {
  const action = createAutomation.bind(null, calendarSlug);
  const [state, formAction, pending] = useActionState<AutomationActionState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <select
        name="trigger"
        defaultValue="registration_created"
        className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
      >
        {AUTOMATION_TRIGGERS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <Input name="name" placeholder="Nombre" className="h-9 w-44" />
      <Button type="submit" size="sm" disabled={pending}>
        Crear
      </Button>
    </form>
  );
}
