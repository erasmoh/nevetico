export function MapBlock({ query, venueName, address }: {
  query?: string;
  venueName?: string | null;
  address?: string | null;
}) {
  const q = query || [venueName, address].filter(Boolean).join(", ");
  if (!q) return null;
  const src = `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed`;
  return (
    <section className="overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
        <h2 className="text-sm font-semibold">Ubicación</h2>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Abrir en Maps
        </a>
      </div>
      <iframe
        title="Mapa"
        src={src}
        className="h-64 w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </section>
  );
}
