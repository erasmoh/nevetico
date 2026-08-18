"use client";

import { createContext, useContext, useCallback } from "react";
import {
  translate,
  type Locale,
} from "@/lib/i18n/dictionaries";

/**
 * Contexto client para i18n. El locale se pasa desde el server (leído de la
 * cookie) y se inyecta en el provider. useT() devuelve un bound translator.
 */

const I18nContext = createContext<Locale>("es");

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(I18nContext);
}

export function useT(): (key: string) => string {
  const locale = useContext(I18nContext);
  return useCallback((key: string) => translate(locale, key), [locale]);
}
