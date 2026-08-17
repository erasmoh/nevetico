// Mockup visual de la página pública de un evento (solo decorativo para el home).
import { CalendarDays, MapPin, Clock, QrCodeIcon, Check } from "lucide-react";

export function EventPreview() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/10">
      {/* barra de browser */}
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
        <span className="size-2.5 rounded-full bg-red-400/80" />
        <span className="size-2.5 rounded-full bg-amber-400/80" />
        <span className="size-2.5 rounded-full bg-green-400/80" />
        <div className="ml-3 flex-1 truncate rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
          nevetico.app/c/tech-meetup-cdmx
        </div>
      </div>

      {/* hero del evento */}
      <div className="relative bg-aurora p-6 sm:p-8">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
          <span className="size-1.5 rounded-full bg-emerald-500" /> Publicado
        </span>
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-foreground/80">
          <CalendarDays className="size-3.5 text-primary" /> vie 22 ago · 19:00
        </p>
        <h3 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
          Tech Meetup CDMX — Agosto
        </h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Una noche de charlas sobre Next.js 16, Supabase e IA. Networking + pizza.
        </p>
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Reservar lugar
        </button>
      </div>

      {/* cuerpo: agenda + sidebar */}
      <div className="grid gap-4 p-6 sm:grid-cols-[1fr_180px]">
        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Agenda
          </p>
          <ul className="flex flex-col gap-2.5 text-sm">
            {[
              ["18:30", "Recepción y networking"],
              ["19:00", "Next.js 16 en producción"],
              ["19:45", "Supabase: RLS en la vida real"],
              ["20:30", "Pizza y networking"],
            ].map(([t, title], i) => (
              <li key={i} className="flex gap-3">
                <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                  {t}
                </span>
                <span className="flex-1">{title}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-border p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MapPin className="size-3.5" /> Impact Hub CDMX
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Av. Reforma 123</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground">
              <span className="font-semibold text-foreground">80</span> cupos
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-3/5 rounded-full bg-primary" />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">48 confirmados</p>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <Check className="size-3.5" /> Tu lugar está confirmado
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="grid size-12 shrink-0 place-items-center rounded-md bg-white">
                <QrCodeIcon className="size-8 text-black" />
              </div>
              <p className="text-xs text-muted-foreground">
                Muestra este QR en la entrada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
