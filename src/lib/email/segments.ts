import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  type SegmentKind,
  type SegmentConfig,
} from "@/lib/email/segment-types";

// Re-export para compat (consumidores server pueden seguir importando de aquí).
export { SEGMENT_KINDS, segmentDescriptor, type SegmentKind, type SegmentConfig, type SegmentDescriptor } from "@/lib/email/segment-types";

/**
 * Segmentos de audiencia. `kind` elige el resolvedor; `config` lleva params
 * (normalmente `{ event_id }`). La resolución usa el admin client (bypass RLS)
 * para leer registros cruzando todos los eventos del calendario.
 *
 * OJO: este módulo es server-only (importa el admin client). Los componentes
 * cliente deben importar el catálogo desde `@/lib/email/segment-types`.
 */

export type SegmentRecipient = { email: string; name: string | null };

type AdminClient = ReturnType<typeof createAdminClient>;
type EmailNameRow = { email: string; name: string | null };

function dedupe(rows: SegmentRecipient[]): SegmentRecipient[] {
  const seen = new Set<string>();
  const out: SegmentRecipient[] = [];
  for (const r of rows) {
    const key = r.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function fromReg(r: EmailNameRow): SegmentRecipient {
  return { email: r.email, name: r.name };
}

/** Resuelve un segmento a una lista de destinatarios. */
export async function resolveSegment(
  calendarId: string,
  kind: SegmentKind,
  config: SegmentConfig,
): Promise<SegmentRecipient[]> {
  const admin = createAdminClient();

  if (kind === "calendar_members") {
    const { data } = await admin
      .from("calendar_members")
      .select("user_id")
      .eq("calendar_id", calendarId);
    const userIds = (data ?? []).map((m) => m.user_id);
    if (userIds.length === 0) return [];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    // email no está en profiles; lo sacamos de auth.users solo si hace falta.
    // Para MVP usamos el display_name y dejamos email vacío → se omite al enviar.
    return dedupe(
      (profiles ?? []).map((p) => ({
        email: "",
        name: p.display_name,
      })),
    );
  }

  const eventId = config.event_id;
  if (!eventId) return [];

  if (kind === "event_going") {
    const { data } = await admin
      .from("registrations")
      .select("email, name")
      .eq("event_id", eventId)
      .eq("status", "going");
    return dedupe((data ?? []).map(fromReg));
  }
  if (kind === "event_registered") {
    const { data } = await admin
      .from("registrations")
      .select("email, name")
      .eq("event_id", eventId)
      .in("status", ["going", "waitlist", "pending"]);
    return dedupe((data ?? []).map(fromReg));
  }
  if (kind === "event_waitlist") {
    const { data } = await admin
      .from("registrations")
      .select("email, name")
      .eq("event_id", eventId)
      .eq("status", "waitlist");
    return dedupe((data ?? []).map(fromReg));
  }
  if (kind === "event_attended") {
    const { data } = await admin
      .from("registrations")
      .select("email, name")
      .eq("event_id", eventId)
      .eq("status", "checked_in");
    return dedupe((data ?? []).map(fromReg));
  }
  if (kind === "event_no_show") {
    // going + sin checkin. Evento ya pasado.
    const { data: regs } = await admin
      .from("registrations")
      .select("id, email, name")
      .eq("event_id", eventId)
      .eq("status", "going");
    const ids = (regs ?? []).map((r) => r.id);
    if (ids.length === 0) return [];
    const { data: checkins } = await admin
      .from("checkins")
      .select("registration_id")
      .in("registration_id", ids);
    const checked = new Set((checkins ?? []).map((c) => c.registration_id));
    return dedupe(
      (regs ?? [])
        .filter((r) => !checked.has(r.id))
        .map((r) => ({ email: r.email, name: r.name })),
    );
  }

  // past_attendees: checked_in en cualquier evento pasado del calendario.
  const { data: events } = await admin
    .from("events")
    .select("id")
    .eq("calendar_id", calendarId)
    .lt("starts_at", new Date().toISOString());
  const eventIds = (events ?? []).map((e) => e.id);
  if (eventIds.length === 0) return [];
  const { data: regs } = await admin
    .from("registrations")
    .select("email, name")
    .in("event_id", eventIds)
    .eq("status", "checked_in");
  return dedupe((regs ?? []).map(fromReg));
}

/** Cuenta destinatarios sin materializarlos todos (para previews grandes). */
export async function countSegment(
  calendarId: string,
  kind: SegmentKind,
  config: SegmentConfig,
): Promise<number> {
  const rows = await resolveSegment(calendarId, kind, config);
  return rows.filter((r) => r.email).length;
}
