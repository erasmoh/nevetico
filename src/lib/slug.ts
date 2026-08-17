/** Convierte un texto en slug URL-safe. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Combina un valor datetime-local ("2026-08-23T18:30") con una zona IANA
 * y devuelve un string que Postgres castea a timestamptz correctamente:
 * "2026-08-23 18:30:00 America/Mexico_City".
 */
export function toTimestamptzString(
  datetimeLocal: string,
  timezone: string,
): string {
  const [date, time] = datetimeLocal.split("T");
  if (!date || !time) return datetimeLocal;
  return `${date} ${time}:00 ${timezone}`;
}
