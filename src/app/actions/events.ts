"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify, toTimestamptzString } from "@/lib/slug";
import {
  fireAutomation,
  loadAutomationsByTrigger,
} from "@/lib/email/automation-engine";
import { triggerWebhooks } from "@/app/actions/api-settings";
import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const eventSchema = z.object({
  calendar_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.trim() ? v : null)),
  title: z.string().min(2).max(120),
  slug: z
    .string()
    .max(60)
    .regex(slugRegex, "Solo minúsculas, números y guiones.")
    .optional()
    .or(z.literal("")),
  description: z.string().max(5000).optional(),
  cover_url: z
    .string()
    .url("La portada es obligatoria. Sube una imagen cuadrada y pega su URL.")
    .min(1, "La portada es obligatoria."),
  starts_at: z.string().min(1, "La fecha de inicio es obligatoria."),
  ends_at: z.string().optional().or(z.literal("")),
  timezone: z.string().min(1),
  location_type: z.enum(["in_person", "online", "hybrid"]),
  venue_name: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  online_url: z.string().url().optional().or(z.literal("")),
  capacity: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().positive().nullable()),
  status: z.enum(["draft", "published"]),
});

export type EventFormState = {
  error?: string;
  errors?: Partial<Record<string, string>>;
} | undefined;

function parseEventForm(formData: FormData) {
  return eventSchema.safeParse({
    calendar_id: formData.get("calendar_id"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    cover_url: formData.get("cover_url"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    timezone: formData.get("timezone"),
    location_type: formData.get("location_type"),
    venue_name: formData.get("venue_name"),
    address: formData.get("address"),
    online_url: formData.get("online_url"),
    capacity: formData.get("capacity"),
    status: formData.get("status"),
  });
}

function errorsFrom(parsed: ReturnType<typeof parseEventForm>) {
  const errors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "_");
      if (!errors[key]) errors[key] = issue.message;
    }
  }
  return errors;
}

export async function createEvent(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { errors: errorsFrom(parsed) };
  }
  const d = parsed.data;

  const slug = (d.slug ?? "").trim() || slugify(d.title);
  if (!slug) return { errors: { slug: "Genera un slug válido." } };

  const supabase = await createClient();
  const startsAt = toTimestamptzString(d.starts_at, d.timezone);
  const endsAt = d.ends_at ? toTimestamptzString(d.ends_at, d.timezone) : null;

  const { data: event, error } = await supabase.rpc("create_event", {
    p_calendar_id: (d.calendar_id ?? null) as string,
    p_slug: slug,
    p_title: d.title,
    p_starts_at: startsAt,
    p_ends_at: endsAt ?? undefined,
    p_description: d.description ?? undefined,
    p_timezone: d.timezone,
    p_location_type: d.location_type,
    p_venue_name: d.venue_name ?? undefined,
    p_address: d.address ?? undefined,
    p_online_url: d.online_url || undefined,
    p_capacity: d.capacity ?? undefined,
    p_status: d.status,
    p_cover_url: d.cover_url,
  });
  if (error) {
    if (error.code === "23505") {
      return {
        errors: {
          slug: d.calendar_id
            ? "Ya existe un evento con ese slug en esta comunidad."
            : "Ya tienes un evento personal con ese slug.",
        },
      };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/events/${event!.id}`);
}

export async function updateEvent(
  eventId: string,
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    return { errors: errorsFrom(parsed) };
  }
  const d = parsed.data;

  const slug = (d.slug ?? "").trim() || slugify(d.title);
  if (!slug) return { errors: { slug: "Genera un slug válido." } };

  const supabase = await createClient();
  const startsAt = toTimestamptzString(d.starts_at, d.timezone);
  const endsAt = d.ends_at ? toTimestamptzString(d.ends_at, d.timezone) : null;

  const { error } = await supabase
    .from("events")
    .update({
      slug,
      title: d.title,
      description: d.description ?? null,
      cover_url: d.cover_url,
      starts_at: startsAt,
      ends_at: endsAt,
      timezone: d.timezone,
      location_type: d.location_type,
      venue_name: d.venue_name ?? null,
      address: d.address ?? null,
      online_url: d.online_url || null,
      capacity: d.capacity,
      status: d.status,
    })
    .eq("id", eventId);
  if (error) {
    if (error.code === "23505") {
      return { errors: { slug: "Ya existe un evento con ese slug en esta comunidad." } };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/events/${eventId}`);
  redirect(`/dashboard/events/${eventId}`);
}

export async function setEventStatus(
  eventId: string,
  status: "draft" | "published" | "canceled" | "completed",
): Promise<void> {
  const supabase = await createClient();

  // Si vamos a publicar, disparamos automatizaciones `event_published` para
  // los eventos de comunidad (antes de actualizar, para leer datos frescos).
  if (status === "published") {
    const { data: ev } = await supabase
      .from("events")
      .select(
        "id, slug, title, starts_at, timezone, venue_name, address, calendar_id, calendar:calendars(id, slug, name)",
      )
      .eq("id", eventId)
      .maybeSingle();
    const row = ev as
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
    if (row?.calendar_id && row.calendar) {
      try {
        const automations = await loadAutomationsByTrigger(
          row.calendar_id,
          "event_published",
        );
        for (const a of automations) {
          await fireAutomation(a, {
            calendarId: row.calendar_id,
            calendarName: row.calendar.name,
            event: {
              id: row.id,
              title: row.title,
              slug: row.slug,
              startsAt: row.starts_at,
              timezone: row.timezone,
              venueName: row.venue_name,
              address: row.address,
              calendarSlug: row.calendar.slug,
            },
            registration: null,
          });
        }
        // Webhook: event.published
        await triggerWebhooks(row.calendar_id, "event.published", {
          event_id: row.id,
          event_title: row.title,
          event_slug: row.slug,
          starts_at: row.starts_at,
        });
      } catch (err) {
        console.error("[automations/webhooks] event_published failed:", err);
      }
    }
  }

  await supabase.from("events").update({ status }).eq("id", eventId);
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath("/dashboard");
}
