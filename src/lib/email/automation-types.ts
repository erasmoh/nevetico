/**
 * Catálogo de triggers y pasos de automatizaciones (UI + validación en actions).
 * Los triggers temporales los dispara el cron `/api/automations/run`; los de
 * evento los disparan las server actions (RSVP / publish).
 */

export type TriggerDescriptor = {
  id: string;
  label: string;
  description: string;
  /** True si lo evalúa el cron por tiempo (no un hook de acción). */
  timeBased: boolean;
};

export const AUTOMATION_TRIGGERS: TriggerDescriptor[] = [
  {
    id: "registration_created",
    label: "Al registrarse alguien",
    description: "Se dispara cuando una persona completa su RSVP.",
    timeBased: false,
  },
  {
    id: "event_published",
    label: "Al publicar el evento",
    description: "Se dispara cuando el evento pasa a publicado.",
    timeBased: false,
  },
  {
    id: "reminder_24h",
    label: "Recordatorio 24h antes",
    description: "A los confirmados, 24 horas antes del inicio.",
    timeBased: true,
  },
  {
    id: "reminder_1h",
    label: "Recordatorio 1h antes",
    description: "A los confirmados, 1 hora antes del inicio.",
    timeBased: true,
  },
  {
    id: "event_ended",
    label: "Al terminar el evento",
    description: "A los confirmados, cuando el evento termina (agradecimiento).",
    timeBased: true,
  },
  {
    id: "no_show",
    label: "A los no-shows",
    description: "A quienes confirmaron pero no se acreditaron.",
    timeBased: true,
  },
];

export function triggerDescriptor(id: string): TriggerDescriptor | undefined {
  return AUTOMATION_TRIGGERS.find((t) => t.id === id);
}

export type StepType = "send_email" | "add_to_segment" | "wait";

export const STEP_TYPES: { id: StepType; label: string; description: string }[] = [
  {
    id: "send_email",
    label: "Enviar email",
    description: "Un email con bloques del page builder (asunto + cuerpo).",
  },
  {
    id: "wait",
    label: "Esperar",
    description: "Retrasa los pasos siguientes N minutos desde el disparo.",
  },
];
