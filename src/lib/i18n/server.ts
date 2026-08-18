import "server-only";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALES,
  translate,
  type Locale,
} from "./dictionaries";

/**
 * i18n server-side. El locale se guarda en una cookie `locale` (seteada por
 * el selector del header). Default 'es'. El dashboard queda en español; las
 * páginas públicas usan t() para traducir.
 */

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const raw = store.get("locale")?.value;
  if (raw && (LOCALES as string[]).includes(raw)) {
    return raw as Locale;
  }
  return DEFAULT_LOCALE;
}

/** Helper para traducir en server components. */
export async function t(key: string): Promise<string> {
  const locale = await getLocale();
  return translate(locale, key);
}

/** Devuelve el locale + un bound t() para pasar a componentes client. */
export async function getI18n(): Promise<{ locale: Locale; t: (k: string) => string }> {
  const locale = await getLocale();
  return { locale, t: (k: string) => translate(locale, k) };
}
