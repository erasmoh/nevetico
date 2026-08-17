import type { Json } from "@/lib/database.types";

/**
 * Tema de una página pública (evento o comunidad). Se guarda como JSONB en
 * `events.theme` / `calendars.theme` y se renderiza como CSS variables con un
 * <style> alcanzado por `data-nvt="<scope>"`, así el tema del organizador no
 * afecta al resto de la app.
 */
export type PageTheme = {
  preset: string;
  font: string;
  radius: number;
  mode: "auto" | "light" | "dark";
  /** Color primario custom en hex (#rrggbb). Sobreescribe el del preset. */
  primary?: string;
};

export const DEFAULT_THEME: PageTheme = {
  preset: "nevetico",
  font: "sans",
  radius: 0.625,
  mode: "auto",
};

type Vars = Record<string, string>;

export type ThemePreset = {
  id: string;
  label: string;
  /** Muestra para el selector (light). */
  swatch: string;
  light: Vars;
  dark: Vars;
};

const neutralDark: Vars = {
  "--background": "oklch(0.145 0 0)",
  "--foreground": "oklch(0.985 0 0)",
  "--card": "oklch(0.185 0 0)",
  "--card-foreground": "oklch(0.985 0 0)",
  "--popover": "oklch(0.185 0 0)",
  "--popover-foreground": "oklch(0.985 0 0)",
  "--secondary": "oklch(0.26 0 0)",
  "--secondary-foreground": "oklch(0.985 0 0)",
  "--muted": "oklch(0.26 0 0)",
  "--muted-foreground": "oklch(0.72 0 0)",
  "--border": "oklch(0.3 0 0)",
  "--input": "oklch(0.3 0 0)",
};

const neutralLight: Vars = {
  "--background": "oklch(1 0 0)",
  "--foreground": "oklch(0.145 0 0)",
  "--card": "oklch(1 0 0)",
  "--card-foreground": "oklch(0.145 0 0)",
  "--popover": "oklch(1 0 0)",
  "--popover-foreground": "oklch(0.145 0 0)",
  "--secondary": "oklch(0.97 0 0)",
  "--secondary-foreground": "oklch(0.205 0 0)",
  "--muted": "oklch(0.97 0 0)",
  "--muted-foreground": "oklch(0.556 0 0)",
  "--border": "oklch(0.922 0 0)",
  "--input": "oklch(0.922 0 0)",
};

function preset(
  id: string,
  label: string,
  swatch: string,
  accentLight: Vars,
  accentDark: Vars,
  baseLight: Vars = neutralLight,
  baseDark: Vars = neutralDark,
): ThemePreset {
  return {
    id,
    label,
    swatch,
    light: { ...baseLight, ...accentLight },
    dark: { ...baseDark, ...accentDark },
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  preset(
    "nevetico",
    "Nevetico (violeta)",
    "oklch(0.488 0.243 264.376)",
    {
      "--primary": "oklch(0.488 0.243 264.376)",
      "--primary-foreground": "oklch(0.985 0 0)",
      "--accent": "oklch(0.967 0.029 264.542)",
      "--accent-foreground": "oklch(0.408 0.18 266.5)",
      "--ring": "oklch(0.55 0.22 264)",
      "--brand": "oklch(0.488 0.243 264.376)",
    },
    {
      "--primary": "oklch(0.62 0.21 264)",
      "--primary-foreground": "oklch(0.145 0 0)",
      "--accent": "oklch(0.3 0.06 264)",
      "--accent-foreground": "oklch(0.9 0.05 264)",
      "--ring": "oklch(0.62 0.21 264)",
      "--brand": "oklch(0.62 0.21 264)",
    },
  ),
  preset(
    "sunset",
    "Sunset (naranja)",
    "oklch(0.66 0.19 42)",
    {
      "--primary": "oklch(0.66 0.19 42)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--accent": "oklch(0.96 0.04 60)",
      "--accent-foreground": "oklch(0.48 0.15 42)",
      "--ring": "oklch(0.66 0.19 42)",
      "--brand": "oklch(0.66 0.19 42)",
    },
    {
      "--primary": "oklch(0.74 0.16 55)",
      "--primary-foreground": "oklch(0.16 0.02 60)",
      "--accent": "oklch(0.32 0.07 45)",
      "--accent-foreground": "oklch(0.92 0.05 60)",
      "--ring": "oklch(0.74 0.16 55)",
      "--brand": "oklch(0.74 0.16 55)",
    },
  ),
  preset(
    "forest",
    "Forest (verde)",
    "oklch(0.55 0.13 160)",
    {
      "--primary": "oklch(0.5 0.13 160)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--accent": "oklch(0.95 0.04 160)",
      "--accent-foreground": "oklch(0.4 0.1 160)",
      "--ring": "oklch(0.5 0.13 160)",
      "--brand": "oklch(0.5 0.13 160)",
    },
    {
      "--primary": "oklch(0.68 0.13 160)",
      "--primary-foreground": "oklch(0.15 0.02 160)",
      "--accent": "oklch(0.3 0.06 160)",
      "--accent-foreground": "oklch(0.9 0.05 160)",
      "--ring": "oklch(0.68 0.13 160)",
      "--brand": "oklch(0.68 0.13 160)",
    },
  ),
  preset(
    "ocean",
    "Ocean (azul)",
    "oklch(0.55 0.16 233)",
    {
      "--primary": "oklch(0.53 0.16 233)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--accent": "oklch(0.95 0.04 233)",
      "--accent-foreground": "oklch(0.42 0.13 233)",
      "--ring": "oklch(0.53 0.16 233)",
      "--brand": "oklch(0.53 0.16 233)",
    },
    {
      "--primary": "oklch(0.68 0.14 233)",
      "--primary-foreground": "oklch(0.15 0.02 233)",
      "--accent": "oklch(0.3 0.06 233)",
      "--accent-foreground": "oklch(0.9 0.05 233)",
      "--ring": "oklch(0.68 0.14 233)",
      "--brand": "oklch(0.68 0.14 233)",
    },
  ),
  preset(
    "candy",
    "Candy (rosa)",
    "oklch(0.62 0.23 350)",
    {
      "--primary": "oklch(0.6 0.23 350)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--accent": "oklch(0.96 0.04 350)",
      "--accent-foreground": "oklch(0.48 0.18 350)",
      "--ring": "oklch(0.6 0.23 350)",
      "--brand": "oklch(0.6 0.23 350)",
    },
    {
      "--primary": "oklch(0.72 0.19 350)",
      "--primary-foreground": "oklch(0.16 0.02 350)",
      "--accent": "oklch(0.32 0.08 350)",
      "--accent-foreground": "oklch(0.92 0.05 350)",
      "--ring": "oklch(0.72 0.19 350)",
      "--brand": "oklch(0.72 0.19 350)",
    },
  ),
  preset(
    "mono",
    "Mono (blanco y negro)",
    "oklch(0.205 0 0)",
    {
      "--primary": "oklch(0.205 0 0)",
      "--primary-foreground": "oklch(0.99 0 0)",
      "--accent": "oklch(0.95 0 0)",
      "--accent-foreground": "oklch(0.205 0 0)",
      "--ring": "oklch(0.4 0 0)",
      "--brand": "oklch(0.205 0 0)",
    },
    {
      "--primary": "oklch(0.95 0 0)",
      "--primary-foreground": "oklch(0.15 0 0)",
      "--accent": "oklch(0.28 0 0)",
      "--accent-foreground": "oklch(0.95 0 0)",
      "--ring": "oklch(0.7 0 0)",
      "--brand": "oklch(0.95 0 0)",
    },
  ),
];

export const THEME_FONTS = [
  { id: "sans", label: "Geist Sans (moderna)", cssVar: "var(--font-sans-base)" },
  { id: "grotesk", label: "Space Grotesk (tech)", cssVar: "var(--font-grotesk)" },
  { id: "display", label: "Playfair Display (editorial)", cssVar: "var(--font-display)" },
  { id: "rounded", label: "Nunito (amigable)", cssVar: "var(--font-rounded)" },
  { id: "mono", label: "Geist Mono (código)", cssVar: "var(--font-geist-mono)" },
] as const;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function parseTheme(raw: Json | null | undefined): PageTheme {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const presetId =
    typeof obj.preset === "string" &&
    THEME_PRESETS.some((p) => p.id === obj.preset)
      ? obj.preset
      : DEFAULT_THEME.preset;
  const font =
    typeof obj.font === "string" && THEME_FONTS.some((f) => f.id === obj.font)
      ? obj.font
      : DEFAULT_THEME.font;
  const radius =
    typeof obj.radius === "number" && obj.radius >= 0 && obj.radius <= 2
      ? obj.radius
      : DEFAULT_THEME.radius;
  const mode =
    obj.mode === "light" || obj.mode === "dark" ? obj.mode : DEFAULT_THEME.mode;
  const primary =
    typeof obj.primary === "string" && HEX_RE.test(obj.primary)
      ? obj.primary
      : undefined;
  return { preset: presetId, font, radius, mode, primary };
}

function presetById(id: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0];
}

function fontVar(id: string): string {
  return (
    THEME_FONTS.find((f) => f.id === id)?.cssVar ?? THEME_FONTS[0].cssVar
  );
}

function declarations(vars: Vars): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v};`)
    .join("");
}

/** Solo letras, números, guiones: el scope va dentro de un selector CSS. */
export function themeScope(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "page";
}

/**
 * CSS del tema, alcanzado a `[data-nvt="<scope>"]`. El orden importa: la
 * regla de modo forzado va al final para ganarle al `.dark` del documento.
 */
export function themeCss(scope: string, theme: PageTheme): string {
  const p = presetById(theme.preset);
  const override: Vars = theme.primary
    ? {
        "--primary": theme.primary,
        "--ring": theme.primary,
        "--brand": theme.primary,
      }
    : {};
  const common: Vars = {
    "--radius": `${theme.radius}rem`,
    "--font-sans": fontVar(theme.font),
    "--font-heading": fontVar(theme.font),
  };
  const light = declarations({ ...p.light, ...override, ...common });
  const dark = declarations({ ...p.dark, ...override, ...common });
  const sel = `[data-nvt="${scope}"]`;
  return [
    `${sel}{${light}}`,
    `.dark ${sel},${sel}.nvt-dark{${dark}}`,
    theme.mode === "light" ? `${sel}.nvt-light{${light}}` : "",
  ]
    .filter(Boolean)
    .join("");
}

/** Clase extra del wrapper según el modo forzado del tema. */
export function themeModeClass(theme: PageTheme): string {
  if (theme.mode === "dark") return "nvt-dark";
  if (theme.mode === "light") return "nvt-light";
  return "";
}
