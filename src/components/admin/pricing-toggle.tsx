"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setPricingEnabled } from "@/app/actions/admin";
import { cn } from "@/lib/utils";

/**
 * Toggle global del pricing. Cuando está APAGADO, toda la app fluye como Pro
 * (sin gating por plan) — útil mientras no se cobra. Al PRENDERLO, se empiezan
 * a enforcear los límites del plan de cada cuenta.
 */
export function PricingToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const next = !enabled;
      const r = await setPricingEnabled(next);
      if (r?.error) toast.error(r.error);
      else {
        toast.success(
          next
            ? "Pricing activado. Los límites por plan se enforcean."
            : "Pricing desactivado. Toda la app fluye como Pro.",
        );
        router.refresh();
      }
    });

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
        enabled
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-2 rounded-full",
          enabled ? "bg-emerald-500" : "bg-muted-foreground/50",
        )}
      />
      {enabled ? "Pricing ON" : "Pricing OFF"}
      <span className="text-xs font-normal text-muted-foreground">
        {enabled ? "(gating por plan activo)" : "(todo fluye como Pro)"}
      </span>
    </button>
  );
}
