"use client";

import { useNow } from "@/lib/client-hooks";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function CountdownBlock({
  title,
  finishedLabel,
  startsAt,
}: {
  title?: string;
  finishedLabel?: string;
  startsAt: string;
}) {
  const target = new Date(startsAt).getTime();
  const now = useNow();

  // Hasta que monta en el cliente pintamos el diff sin segundos vivos para no
  // romper la hidratación con dos relojes distintos.
  const diff = target - (now ?? target);
  const { days, hours, minutes, seconds } = parts(diff);
  const finished = now !== null && diff <= 0;

  const cells = [
    { value: days, label: "días" },
    { value: hours, label: "horas" },
    { value: minutes, label: "min" },
    { value: seconds, label: "seg" },
  ];

  return (
    <section className="rounded-xl border border-border bg-accent/40 p-6 text-center">
      {finished ? (
        <p className="font-heading text-xl font-semibold">{finishedLabel ?? "¡Ya empezó!"}</p>
      ) : (
        <>
          {title ? (
            <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {title}
            </p>
          ) : null}
          <div className="grid grid-cols-4 gap-3">
            {cells.map((c) => (
              <div key={c.label} className="flex flex-col">
                <span
                  suppressHydrationWarning
                  className="font-heading text-3xl font-semibold tabular-nums sm:text-4xl"
                >
                  {String(c.value).padStart(2, "0")}
                </span>
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
