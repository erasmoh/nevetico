"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateEventTheme } from "@/app/actions/page-blocks";
import { DEFAULT_THEME, THEME_FONTS, THEME_PRESETS, type PageTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const RADII = [
  { value: 0, label: "Recto" },
  { value: 0.375, label: "Suave" },
  { value: 0.625, label: "Medio" },
  { value: 1, label: "Redondo" },
];

const MODES: { value: PageTheme["mode"]; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

export function ThemeEditor({
  eventId,
  theme,
  onSaved,
}: {
  eventId: string;
  theme: PageTheme;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<PageTheme>(theme);
  const [pending, startTransition] = useTransition();

  const save = (next: PageTheme) => {
    setDraft(next);
    startTransition(async () => {
      const result = await updateEventTheme(eventId, next);
      if (result?.error) toast.error(result.error);
      else onSaved();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Label>Paleta</Label>
        <div className="grid grid-cols-2 gap-2">
          {THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => save({ ...draft, preset: preset.id, primary: undefined })}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border p-2 text-left text-sm transition hover:bg-accent",
                draft.preset === preset.id && "border-primary ring-2 ring-primary/30",
              )}
            >
              <span
                className="size-6 shrink-0 rounded-md border border-black/10"
                style={{ background: preset.swatch }}
              />
              <span className="truncate">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="theme-primary">Color principal</Label>
        <div className="flex items-center gap-2">
          <input
            id="theme-primary"
            type="color"
            value={draft.primary ?? "#6d5efc"}
            onChange={(e) => save({ ...draft, primary: e.target.value })}
            className="h-9 w-16 cursor-pointer rounded-lg border border-input bg-transparent p-1"
          />
          {draft.primary ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => save({ ...draft, primary: undefined })}
            >
              Usar el de la paleta
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Tipografía</Label>
        <div className="grid grid-cols-2 gap-2">
          {THEME_FONTS.map((font) => (
            <button
              key={font.id}
              type="button"
              onClick={() => save({ ...draft, font: font.id })}
              className={cn(
                "rounded-lg border border-border px-3 py-2 text-sm transition hover:bg-accent",
                draft.font === font.id && "border-primary ring-2 ring-primary/30",
              )}
              style={{ fontFamily: font.cssVar }}
            >
              {font.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Esquinas</Label>
        <div className="flex flex-wrap gap-2">
          {RADII.map((radius) => (
            <button
              key={radius.value}
              type="button"
              onClick={() => save({ ...draft, radius: radius.value })}
              className={cn(
                "border border-border px-3 py-1.5 text-sm transition hover:bg-accent",
                draft.radius === radius.value && "border-primary ring-2 ring-primary/30",
              )}
              style={{ borderRadius: `${radius.value}rem` }}
            >
              {radius.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Modo</Label>
        <div className="flex flex-wrap gap-2">
          {MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => save({ ...draft, mode: mode.value })}
              className={cn(
                "rounded-lg border border-border px-3 py-1.5 text-sm transition hover:bg-accent",
                draft.mode === mode.value && "border-primary ring-2 ring-primary/30",
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          {pending ? "Guardando…" : "Los cambios se guardan al instante."}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => save({ ...DEFAULT_THEME })}
        >
          Restablecer
        </Button>
      </div>
    </div>
  );
}
