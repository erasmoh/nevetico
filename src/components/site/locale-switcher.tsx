"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/dictionaries";

/**
 * Selector de idioma. Setea la cookie `locale` via una route simple y refresca.
 * Usa un select nativo para minimizar JS.
 */
export function LocaleSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(locale: Locale) {
    startTransition(async () => {
      // Setear la cookie via fetch a una route simple.
      await fetch("/api/i18n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      router.refresh();
    });
  }

  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) => change(e.target.value as Locale)}
      className="h-8 rounded-md border border-input bg-transparent px-2 text-xs text-muted-foreground hover:text-foreground"
      aria-label="Idioma"
    >
      {LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
