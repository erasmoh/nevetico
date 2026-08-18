"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useT } from "@/components/site/locale-context";

/**
 * Filtros de /explore. Cada cambio actualiza los searchParams (push, no
 * replace, para que el back funcione). Las opciones de ciudad/tema se pasan
 * desde el server (derivadas de los eventos publicados).
 */
export function ExploreFilters({
  cities,
  topics,
  currentCity,
  currentTopic,
  currentQuery,
  currentWhen,
}: {
  cities: string[];
  topics: string[];
  currentCity: string;
  currentTopic: string;
  currentQuery: string;
  currentWhen: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useT();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value && value !== "all") next.set(key, value);
      else next.delete(key);
      // Mantener página 1 al filtrar.
      next.delete("page");
      router.push(`/explore?${next.toString()}`);
    },
    [params, router],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Input
        placeholder={t("explore.search")}
        defaultValue={currentQuery}
        onChange={(e) => {
          const v = e.target.value;
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => update("q", v), 350);
        }}
      />
      <Select
        value={currentCity || "all"}
        onValueChange={(v) => update("city", v ?? "all")}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("explore.city")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("explore.city.all")}</SelectItem>
          {cities.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={currentTopic || "all"}
        onValueChange={(v) => update("topic", v ?? "all")}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("explore.topic")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("explore.topic.all")}</SelectItem>
          {topics.map((tp) => (
            <SelectItem key={tp} value={tp}>
              {tp}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={currentWhen || "all"}
        onValueChange={(v) => update("when", v ?? "all")}
      >
        <SelectTrigger>
          <SelectValue placeholder={t("explore.when")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("explore.when.all")}</SelectItem>
          <SelectItem value="today">{t("explore.when.today")}</SelectItem>
          <SelectItem value="week">{t("explore.when.week")}</SelectItem>
          <SelectItem value="month">{t("explore.when.month")}</SelectItem>
          <SelectItem value="past">{t("explore.when.past")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
