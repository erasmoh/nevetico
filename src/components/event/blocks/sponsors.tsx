import { BlockSection } from "./section";

export type SponsorLogo = { name?: string; logo_url?: string; link?: string };
export type SponsorTier = { name?: string; size?: string; logos?: SponsorLogo[] };

const logoSize: Record<string, string> = {
  lg: "h-16",
  md: "h-12",
  sm: "h-8",
};

/**
 * Sponsors como ciudadano de primera clase: tiers con logos, links con UTM
 * (`utm_source=nevetico`) para que el organizador mida el tráfico que le manda
 * a su patrocinador, y tracking interno de impresiones + clicks vía
 * `/api/s/track` (las stats se ven en el portal del sponsor).
 */
function withUtm(link: string, eventSlug?: string): string {
  try {
    const u = new URL(link);
    u.searchParams.set("utm_source", "nevetico");
    u.searchParams.set("utm_medium", "sponsor");
    if (eventSlug) u.searchParams.set("utm_campaign", eventSlug);
    return u.toString();
  } catch {
    return link;
  }
}

/** URL de tracking de click: registra y redirige al destino. */
function clickTrackUrl(eventId: string, name: string, link: string): string {
  return `/api/s/track?event=${encodeURIComponent(eventId)}&name=${encodeURIComponent(name)}&type=click&link=${encodeURIComponent(link)}`;
}

/** URL de tracking de impresión (pixel 1x1). */
function impressionPixelUrl(eventId: string, name: string): string {
  return `/api/s/track?event=${encodeURIComponent(eventId)}&name=${encodeURIComponent(name)}&type=impression`;
}

export function SponsorsBlock({
  eventId,
  title,
  note,
  contactUrl,
  tiers,
  eventSlug,
}: {
  eventId: string;
  title?: string;
  note?: string;
  contactUrl?: string;
  tiers?: SponsorTier[];
  eventSlug?: string;
}) {
  const list = (tiers ?? []).filter((t) => (t?.logos ?? []).some((l) => l?.name || l?.logo_url));
  if (list.length === 0 && !note) return null;

  return (
    <BlockSection title={title ?? "Sponsors"}>
      <div className="flex flex-col gap-6">
        {list.map((tier, i) => (
          <div key={i} className="flex flex-col gap-3">
            {tier.name ? (
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {tier.name}
              </p>
            ) : null}
            <ul className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {(tier.logos ?? [])
                .filter((l) => l?.name || l?.logo_url)
                .map((logo, j) => {
                  const name = logo.name ?? `sponsor-${j}`;
                  const inner = logo.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo.logo_url}
                      alt={name}
                      className={`w-auto object-contain ${logoSize[tier.size ?? "md"] ?? logoSize.md}`}
                    />
                  ) : (
                    <span className="font-medium">{name}</span>
                  );
                  // Pixel de impresión (1x1 transparente, se carga con la página).
                  const pixel = (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={impressionPixelUrl(eventId, name)}
                      alt=""
                      width={1}
                      height={1}
                      className="absolute opacity-0"
                      aria-hidden
                    />
                  );
                  return (
                    <li key={j} className="relative">
                      {logo.link ? (
                        <a
                          href={clickTrackUrl(eventId, name, withUtm(logo.link, eventSlug))}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          title={name}
                          className="block opacity-80 transition-opacity hover:opacity-100"
                        >
                          {inner}
                        </a>
                      ) : (
                        inner
                      )}
                      {pixel}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}

        {note ? (
          <p className="text-sm text-muted-foreground">
            {note}{" "}
            {contactUrl ? (
              <a
                href={contactUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Hablemos
              </a>
            ) : null}
          </p>
        ) : null}
      </div>
    </BlockSection>
  );
}
