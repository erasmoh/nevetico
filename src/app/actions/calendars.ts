"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createCalendarSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(slugRegex, "Solo minúsculas, números y guiones. Ej: tech-meetup-cdmx"),
  description: z.string().max(500).optional(),
});

export type CalendarErrors = Partial<
  Record<keyof z.infer<typeof createCalendarSchema>, string>
>;

export type CalendarFormState = {
  error?: string;
  errors?: CalendarErrors;
} | undefined;

export async function createCalendar(
  _state: CalendarFormState,
  formData: FormData,
): Promise<CalendarFormState> {
  const parsed = createCalendarSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    const errors: CalendarErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CalendarErrors;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_calendar", {
    p_slug: parsed.data.slug,
    p_name: parsed.data.name,
    p_description: parsed.data.description ?? undefined,
  });
  if (error) {
    if (error.code === "23505") {
      return { errors: { slug: "Ese slug ya está en uso. Prueba otro." } };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendars");
  redirect("/dashboard");
}
