"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { DEFAULT_THEME, THEME_FONTS, THEME_PRESETS } from "@/lib/theme";
import { calendarOwnerPlan, entitlementsFor } from "@/lib/entitlements";

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

const domainRegex = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/;

const brandingSchema = z.object({
  logo_url: z.union([z.literal(""), z.string().url()]),
  cover_url: z.union([z.literal(""), z.string().url()]),
  custom_domain: z.union([
    z.literal(""),
    z.string().max(253).regex(domainRegex, "Dominio inválido. Ej: eventos.midominio.com"),
  ]),
  preset: z.enum(THEME_PRESETS.map((p) => p.id) as [string, ...string[]]),
  font: z.enum(THEME_FONTS.map((f) => f.id) as [string, ...string[]]),
  mode: z.enum(["auto", "light", "dark"]),
});

export type BrandingErrors = Partial<
  Record<keyof z.infer<typeof brandingSchema>, string>
>;

export type BrandingFormState =
  | { error?: string; errors?: BrandingErrors; ok?: boolean }
  | undefined;

/** Branding de la comunidad: logo, portada, tema y dominio propio. */
export async function updateCalendarBranding(
  slug: string,
  _state: BrandingFormState,
  formData: FormData,
): Promise<BrandingFormState> {
  const parsed = brandingSchema.safeParse({
    logo_url: formData.get("logo_url") ?? "",
    cover_url: formData.get("cover_url") ?? "",
    custom_domain: (formData.get("custom_domain") ?? "")
      .toString()
      .trim()
      .toLowerCase(),
    preset: formData.get("preset"),
    font: formData.get("font"),
    mode: formData.get("mode"),
  });
  if (!parsed.success) {
    const errors: BrandingErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof BrandingErrors;
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return { errors };
  }

  const supabase = await createClient();

  // Gate de dominio propio: solo Pro+ puede setear custom_domain.
  // Community puede *limpiar* el dominio (pasarlo a vacío) pero no asignarlo.
  if (parsed.data.custom_domain) {
    const { data: cal } = await supabase
      .from("calendars")
      .select("id, custom_domain")
      .eq("slug", slug)
      .maybeSingle();
    const changingDomain = cal?.custom_domain !== parsed.data.custom_domain;
    if (changingDomain && cal) {
      const plan = await calendarOwnerPlan(supabase, cal.id);
      if (!entitlementsFor(plan).customDomainAllowed) {
        return {
          errors: {
            custom_domain:
              "El dominio propio está disponible a partir del plan Pro. (Modo prueba: el pricing se activa desde el admin.)",
          },
        };
      }
    }
  }

  const { error } = await supabase
    .from("calendars")
    .update({
      logo_url: parsed.data.logo_url || null,
      cover_url: parsed.data.cover_url || null,
      custom_domain: parsed.data.custom_domain || null,
      theme: {
        ...DEFAULT_THEME,
        preset: parsed.data.preset,
        font: parsed.data.font,
        mode: parsed.data.mode,
      },
    })
    .eq("slug", slug);
  if (error) {
    if (error.code === "23505") {
      return { errors: { custom_domain: "Ese dominio ya está en uso." } };
    }
    return { error: error.message };
  }

  revalidatePath(`/dashboard/calendars/${slug}`);
  revalidatePath(`/c/${slug}`);
  return { ok: true };
}
