import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { entitlementsFor, type Plan } from "@/lib/entitlements";
import type { Json } from "@/lib/database.types";

export type EmailTemplate =
  | "confirmation"
  | "reminder_24h"
  | "reminder_1h"
  | "changed"
  | "thankyou"
  | "welcome"
  | "campaign"
  | "automation"
  | "ticket_confirmation"
  | "refund";

export type EnqueueEmailArgs = {
  template: EmailTemplate;
  toEmail: string;
  toName?: string | null;
  subject: string;
  eventId?: string;
  registrationId?: string;
  campaignId?: string;
  automationId?: string;
  calendarId?: string;
  payload?: Record<string, unknown>;
  /** Variables del destinatario (first_name, event_title, rsvp_url…). */
  context?: Record<string, unknown>;
  scheduledFor?: Date;
};

export type EnqueueResult =
  | { ok: true }
  | { ok: false; reason: "quota_exceeded"; limit: number; used: number };

/**
 * Cuenta los emails enviados este mes calendario para un calendario (todos
 * los estados excepto skipped/canceled). Usa el admin client (bypass RLS).
 */
export async function emailsThisMonth(
  calendarId: string,
): Promise<number> {
  const admin = createAdminClient();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count } = await admin
    .from("email_queue")
    .select("id", { count: "exact", head: true })
    .eq("calendar_id", calendarId)
    .gte("created_at", startOfMonth)
    .in("status", ["pending", "sent", "failed"]);
  return count ?? 0;
}

/** Plan del owner de un calendario, vía admin client (para encolar desde el motor). */
async function ownerPlanForCalendar(calendarId: string): Promise<Plan> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("calendars")
    .select("owner_id")
    .eq("id", calendarId)
    .maybeSingle();
  if (!data?.owner_id) return "community";
  const { data: plan } = await admin.rpc("user_plan", { p_user_id: data.owner_id });
  return (plan as Plan) ?? "community";
}

/**
 * Encola un email en `email_queue`. No envía: un worker/route procesa la cola.
 * Aplica la cuota mensual del plan del owner del calendario: si se excede, no
 * encola y devuelve `{ ok: false, reason: 'quota_exceeded' }`. Los emails sin
 * `calendarId` (transaccionales sin comunidad) no se cuentan.
 */
export async function enqueueEmail(args: EnqueueEmailArgs): Promise<EnqueueResult> {
  const admin = createAdminClient();

  if (args.calendarId) {
    const plan = await ownerPlanForCalendar(args.calendarId);
    const limit = entitlementsFor(plan).maxEmailsPerMonth;
    if (limit != null) {
      const used = await emailsThisMonth(args.calendarId);
      if (used >= limit) {
        console.warn(
          `[email_queue] quota exceeded: calendar=${args.calendarId} used=${used} limit=${limit}`,
        );
        return { ok: false, reason: "quota_exceeded", limit, used };
      }
    }
  }

  const scheduledFor = args.scheduledFor
    ? args.scheduledFor.toISOString()
    : new Date().toISOString();
  const { error } = await admin.from("email_queue").insert({
    template: args.template,
    to_email: args.toEmail,
    to_name: args.toName ?? null,
    subject: args.subject,
    event_id: args.eventId ?? null,
    registration_id: args.registrationId ?? null,
    campaign_id: args.campaignId ?? null,
    automation_id: args.automationId ?? null,
    calendar_id: args.calendarId ?? null,
    payload: (args.payload ?? {}) as Json,
    context: (args.context ?? {}) as Json,
    scheduled_for: scheduledFor,
    status: "pending",
  });
  if (error) {
    console.error("[email_queue] insert failed:", error.message);
    // No es quota, pero no encolamos. Lo tratamos como fallo genérico.
    return { ok: false, reason: "quota_exceeded", limit: 0, used: 0 };
  }
  return { ok: true };
}
