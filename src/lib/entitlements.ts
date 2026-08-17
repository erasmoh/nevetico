import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Entitlements por plan. El catálogo es la **única** fuente de verdad de
 * límites — el gating server-side lo consulta, no se dispersan `if` por la
 * app. Defaults por plan; los overrides de asistentes por evento/perfil se
 * resuelven en `effectiveMaxAttendees`.
 *
 * Plan efectivo:
 *  - recurso de comunidad → plan del owner del calendario
 *  - evento personal → plan del created_by
 *  - si `app_settings.pricing_enabled = false`, todo el mundo es 'pro'
 *    (relajamos el gating sin tocar filas; útil para encender el pricing
 *    cuando se quiera empezar a cobrar).
 *
 * Las funciones SQL `user_plan`/`calendar_owner_plan`/`event_organizer_plan`
 * ya encapsulan la regla de pricing_enabled; aquí las reutilizamos vía RPC
 * para no duplicar lógica. Para el admin (asignar plan, overrides) usamos el
 * admin client.
 */

export type Plan = "community" | "pro" | "business";

export const PLAN_LABELS: Record<Plan, string> = {
  community: "Community",
  pro: "Pro",
  business: "Business",
};

export type Entitlements = {
  /** Asistentes por evento. null = ilimitado. */
  maxAttendeesPerEvent: number | null;
  /** Emails por mes por calendario. null = ilimitado. */
  maxEmailsPerMonth: number | null;
  /** Hosts extra (rol 'host' en calendar_members, sin contar el owner). */
  maxExtraHosts: number | null;
  /** Máximo de logos de sponsors en un evento. */
  maxSponsorLogos: number | null;
  /** Si permite tiers de sponsors (agrupar logos por tier). */
  sponsorTiersAllowed: boolean;
  /** Si permite configurar dominio propio. */
  customDomainAllowed: boolean;
  /** Si permite tickets pagos (price_cents > 0). Bloqueado hasta Fase 4b. */
  paidTicketsAllowed: boolean;
};

export const PLAN_ENTITLEMENTS: Record<Plan, Entitlements> = {
  community: {
    maxAttendeesPerEvent: 100,
    maxEmailsPerMonth: 1000,
    maxExtraHosts: 0,
    maxSponsorLogos: 1,
    sponsorTiersAllowed: false,
    customDomainAllowed: false,
    paidTicketsAllowed: false,
  },
  pro: {
    maxAttendeesPerEvent: null,
    maxEmailsPerMonth: 25_000,
    maxExtraHosts: 10,
    maxSponsorLogos: null,
    sponsorTiersAllowed: true,
    customDomainAllowed: true,
    paidTicketsAllowed: false,
  },
  business: {
    maxAttendeesPerEvent: null,
    maxEmailsPerMonth: 150_000,
    maxExtraHosts: null,
    maxSponsorLogos: null,
    sponsorTiersAllowed: true,
    customDomainAllowed: true,
    paidTicketsAllowed: false,
  },
};

export function entitlementsFor(plan: string): Entitlements {
  return (
    PLAN_ENTITLEMENTS[plan as Plan] ?? PLAN_ENTITLEMENTS.community
  );
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Plan efectivo del owner de un calendario (vía la función SQL). */
export async function calendarOwnerPlan(
  supabase: Supabase,
  calendarId: string,
): Promise<Plan> {
  const { data } = await supabase.rpc("calendar_owner_plan", {
    p_cal_id: calendarId,
  });
  return (data as Plan) ?? "community";
}

/** Plan efectivo del organizador de un evento (vía la función SQL). */
export async function eventOrganizerPlan(
  supabase: Supabase,
  eventId: string,
): Promise<Plan> {
  const { data } = await supabase.rpc("event_organizer_plan", {
    p_ev_id: eventId,
  });
  return (data as Plan) ?? "community";
}

/**
 * Límite efectivo de asistentes para un evento:
 *  1. Si el evento tiene `max_attendees_override`, ese gana.
 *  2. Si no, el `max_attendees_override` del perfil del organizador.
 *  3. Si no, el default del plan del organizador.
 *  4. null = ilimitado.
 * El caller pasa el plan del organizador (resuelto vía `eventOrganizerPlan`)
 * y los overrides (leídos de la fila del evento + perfil) para evitar N
 * queries cuando se invoca desde la RPC de registro.
 */
export function effectiveMaxAttendees(
  plan: Plan,
  eventOverride: number | null,
  profileOverride: number | null,
): number | null {
  if (eventOverride != null) return eventOverride;
  if (profileOverride != null) return profileOverride;
  return entitlementsFor(plan).maxAttendeesPerEvent;
}

/** ¿Está el pricing global encendido? Lo lee el admin client (1 fila). */
export async function pricingEnabled(): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "pricing_enabled")
    .maybeSingle();
  const v = data?.value as { pricing_enabled?: boolean } | null;
  return !!v?.pricing_enabled;
}
