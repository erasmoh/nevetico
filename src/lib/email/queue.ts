import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";

export type EmailTemplate =
  | "confirmation"
  | "reminder_24h"
  | "reminder_1h"
  | "changed"
  | "thankyou"
  | "welcome"
  | "campaign"
  | "automation";

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

/**
 * Encola un email en `email_queue`. No envía: un worker/route procesa la cola.
 * Si RESEND_API_KEY está configurado, el worker envía de verdad; si no, marca
 * como 'sent' (stub de desarrollo).
 */
export async function enqueueEmail(args: EnqueueEmailArgs) {
  const admin = createAdminClient();
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
  if (error) console.error("[email_queue] insert failed:", error.message);
}
