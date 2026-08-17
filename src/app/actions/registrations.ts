"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { enqueueEmail } from "@/lib/email/queue";
import {
  fireAutomation,
  loadAutomationsByTrigger,
} from "@/lib/email/automation-engine";
import { z } from "zod";

const rsvpSchema = z.object({
  event_id: z.uuid(),
  email: z.email(),
  name: z.string().min(1).max(120).optional(),
});

export type RsvpFormState = {
  ok?: boolean;
  status?: string;
  error?: string;
} | undefined;

export async function rsvp(
  _state: RsvpFormState,
  formData: FormData,
): Promise<RsvpFormState> {
  const parsed = rsvpSchema.safeParse({
    event_id: formData.get("event_id"),
    email: formData.get("email"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: "Revisa tu correo y nombre." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Email: si el usuario está logueado, usamos el suyo (prioridad); si no, el del form.
  const email = user?.email ?? parsed.data.email;
  const name = parsed.data.name ?? (user?.user_metadata?.display_name as string | undefined);

  const { data: registration, error } = await supabase.rpc("register_for_event", {
    p_event_id: parsed.data.event_id,
    p_email: email,
    p_name: name,
    p_user_id: user?.id ?? undefined,
  });
  if (error) {
    const msg = error.message;
    if (msg.includes("already_registered")) {
      return { error: "Ya estás registrado en este evento." };
    }
    if (msg.includes("event_not_found_or_not_published")) {
      return { error: "El evento no está disponible para registro." };
    }
    return { error: msg };
  }

  // Encolar email de confirmación
  const { data: event } = await supabase
    .from("events")
    .select(
      "id, slug, title, starts_at, timezone, venue_name, address, calendar_id, calendar:calendars(id, slug, name)",
    )
    .eq("id", parsed.data.event_id)
    .maybeSingle();

  const ev = event as
    | {
        id: string;
        slug: string;
        title: string;
        starts_at: string;
        timezone: string;
        venue_name: string | null;
        address: string | null;
        calendar_id: string | null;
        calendar: { id: string; slug: string; name: string } | null;
      }
    | null;

  await enqueueEmail({
    template: "confirmation",
    toEmail: email,
    toName: name,
    subject: `Confirmado: ${ev?.title ?? "Tu evento"}`,
    eventId: parsed.data.event_id,
    registrationId: registration?.id,
    calendarId: ev?.calendar_id ?? undefined,
    payload: {
      event_title: ev?.title,
      starts_at: ev?.starts_at,
      timezone: ev?.timezone,
      calendar_name: ev?.calendar?.name ?? null,
      status: registration?.status,
    },
  });

  // Disparar automatizaciones `registration_created` (solo eventos de comunidad).
  if (ev?.calendar_id && ev.calendar) {
    try {
      const automations = await loadAutomationsByTrigger(
        ev.calendar_id,
        "registration_created",
      );
      for (const a of automations) {
        await fireAutomation(a, {
          calendarId: ev.calendar_id,
          calendarName: ev.calendar.name,
          event: {
            id: ev.id,
            title: ev.title,
            slug: ev.slug,
            startsAt: ev.starts_at,
            timezone: ev.timezone,
            venueName: ev.venue_name,
            address: ev.address,
            calendarSlug: ev.calendar.slug,
          },
          registration: { email, name: name ?? null },
        });
      }
    } catch (err) {
      console.error("[automations] registration_created failed:", err);
    }
  }

  revalidatePath("/c/[calendarSlug]/[eventSlug]", "page");
  return { ok: true, status: registration?.status };
}

export async function cancelRsvp(eventId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: reg } = await supabase
    .from("registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .neq("status", "canceled")
    .maybeSingle();
  if (!reg) return;

  await supabase.from("registrations").update({ status: "canceled" }).eq("id", reg.id);
  revalidatePath("/c/[calendarSlug]/[eventSlug]", "page");
}
