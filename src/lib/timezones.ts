/** Zonas horarias comunes para el selector. */
export const TIMEZONES: string[] = [
  "America/Mexico_City",
  "America/Monterrey",
  "America/Guadalajara",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Buenos_Aires",
  "America/Montevideo",
  "America/Sao_Paulo",
  "America/Costa_Rica",
  "America/Guatemala",
  "UTC",
  "Europe/Madrid",
  "Europe/Lisbon",
  "Europe/London",
  "US/Pacific",
  "US/Eastern",
];

export function defaultTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TIMEZONES.includes(tz) ? tz : "America/Mexico_City";
  } catch {
    return "America/Mexico_City";
  }
}
