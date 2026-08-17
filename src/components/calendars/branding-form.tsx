"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  updateCalendarBranding,
  type BrandingFormState,
} from "@/app/actions/calendars";
import { THEME_FONTS, THEME_PRESETS, type PageTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BrandingForm({
  slug,
  theme,
  logoUrl,
  coverUrl,
  customDomain,
  siteHost,
}: {
  slug: string;
  theme: PageTheme;
  logoUrl: string | null;
  coverUrl: string | null;
  customDomain: string | null;
  siteHost: string;
}) {
  const action = updateCalendarBranding.bind(null, slug);
  const [state, formAction, pending] = useActionState<BrandingFormState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) toast.success("Branding actualizado");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="logo_url">Logo (URL)</Label>
        <Input
          id="logo_url"
          name="logo_url"
          type="url"
          defaultValue={logoUrl ?? ""}
          placeholder="https://…/logo.png"
        />
        {state?.errors?.logo_url ? (
          <p className="text-xs text-destructive">{state.errors.logo_url}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="cover_url">Portada (URL)</Label>
        <Input
          id="cover_url"
          name="cover_url"
          type="url"
          defaultValue={coverUrl ?? ""}
          placeholder="https://…/cover.jpg"
        />
        {state?.errors?.cover_url ? (
          <p className="text-xs text-destructive">{state.errors.cover_url}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="preset">Paleta</Label>
          <select
            id="preset"
            name="preset"
            defaultValue={theme.preset}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
          >
            {THEME_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="font">Tipografía</Label>
          <select
            id="font"
            name="font"
            defaultValue={theme.font}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
          >
            {THEME_FONTS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="mode">Modo</Label>
          <select
            id="mode"
            name="mode"
            defaultValue={theme.mode}
            className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
          >
            <option value="auto">Automático</option>
            <option value="light">Claro</option>
            <option value="dark">Oscuro</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="custom_domain">Dominio propio</Label>
        <Input
          id="custom_domain"
          name="custom_domain"
          defaultValue={customDomain ?? ""}
          placeholder="eventos.midominio.com"
        />
        <p className="text-xs text-muted-foreground">
          Apunta un registro CNAME de tu dominio a <code>{siteHost}</code>. Al
          resolverse, ese dominio servirá la página de esta comunidad.
        </p>
        {state?.errors?.custom_domain ? (
          <p className="text-xs text-destructive">{state.errors.custom_domain}</p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
