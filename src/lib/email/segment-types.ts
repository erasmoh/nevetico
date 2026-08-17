/**
 * Tipos y catálogo de segmentos (client-safe, sin imports server-only).
 * El resolver que usa el admin client vive en `segments.ts` (server-only).
 */

export type SegmentKind =
  | "event_going"
  | "event_registered"
  | "event_waitlist"
  | "event_attended"
  | "event_no_show"
  | "calendar_members"
  | "past_attendees";

export type SegmentConfig = { event_id?: string };

export type SegmentDescriptor = {
  kind: SegmentKind;
  label: string;
  description: string;
  needsEvent: boolean;
};

export const SEGMENT_KINDS: SegmentDescriptor[] = [
  {
    kind: "event_going",
    label: "Confirmados de un evento",
    description: "Asistentes con estado 'going' de un evento.",
    needsEvent: true,
  },
  {
    kind: "event_registered",
    label: "Registrados de un evento",
    description: "Cualquiera con registro activo (going, waitlist o pending).",
    needsEvent: true,
  },
  {
    kind: "event_waitlist",
    label: "Lista de espera de un evento",
    description: "Asistentes en lista de espera.",
    needsEvent: true,
  },
  {
    kind: "event_attended",
    label: "Asistieron a un evento",
    description: "Registros con check-in (checked_in).",
    needsEvent: true,
  },
  {
    kind: "event_no_show",
    label: "No-shows de un evento",
    description: "Confirmados que no se acreditaron (evento pasado).",
    needsEvent: true,
  },
  {
    kind: "calendar_members",
    label: "Miembros de la comunidad",
    description: "Todos los miembros del calendario (cualquier rol).",
    needsEvent: false,
  },
  {
    kind: "past_attendees",
    label: "Asistentes a eventos pasados",
    description: "Emails que se acreditaron en eventos anteriores del calendario.",
    needsEvent: false,
  },
];

export function segmentDescriptor(kind: string): SegmentDescriptor | undefined {
  return SEGMENT_KINDS.find((k) => k.kind === kind);
}
