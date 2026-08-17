/** Formatea una fecha ISO/timestamptz en la zona dada, en español. */
export function formatEventDate(
  iso: string,
  timezone: string,
  opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  },
): string {
  try {
    return new Intl.DateTimeFormat("es-MX", { ...opts, timeZone: timezone }).format(
      new Date(iso),
    );
  } catch {
    return new Date(iso).toLocaleString("es-MX");
  }
}

export function formatEventDay(iso: string, timezone: string): string {
  return formatEventDate(iso, timezone, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatEventTime(iso: string, timezone: string): string {
  return formatEventDate(iso, timezone, { hour: "2-digit", minute: "2-digit" });
}

/** Convierte un ISO/timestamptz a un valor válido para <input type="datetime-local">
 *  expresado en la zona dada ("YYYY-MM-DDTHH:mm"). */
export function toDatetimeLocalInput(iso: string, timezone: string): string {
  try {
    const d = new Date(iso);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    let hour = get("hour");
    if (hour === "24") hour = "00";
    return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
  } catch {
    return iso.slice(0, 16);
  }
}

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  canceled: "Cancelado",
  completed: "Completado",
  going: "Confirmado",
  waitlist: "En espera",
  pending: "Pendiente",
  declined: "Rechazado",
  "checked_in": "Acreditado",
};

export function statusLabel(status: string): string {
  return statusLabels[status] ?? status;
}
