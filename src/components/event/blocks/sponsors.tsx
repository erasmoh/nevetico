import { BlockSection } from "./section";

export type SponsorLogo = { name?: string; logo_url?: string; link?: string };
export type SponsorTier = { name?: string; size?: string; logos?: SponsorLogo[] };

const logoSize: Record<string, string> = {
  lg: "h-16",
  md: "h-12",
  sm: "h-8",
};

/**
 * Sponsors como ciudadano de primera clase: tiers con logos y links con UTM
 * (`utm_source=nevetico`) para que el organizador pueda medir el tráfico que
 * le manda a su patrocinador.
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

export function SponsorsBlock({
  title,
  note,
  contactUrl,
  tiers,
  eventSlug,
}: {
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
                  const inner = logo.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo.logo_url}
                      alt={logo.name ?? ""}
                      className={`w-auto object-contain ${logoSize[tier.size ?? "md"] ?? logoSize.md}`}
                    />
                  ) : (
                    <span className="font-medium">{logo.name}</span>
                  );
                  return (
                    <li key={j}>
                      {logo.link ? (
                        <a
                          href={withUtm(logo.link, eventSlug)}
                          target="_blank"
                          rel="noopener noreferrer sponsored"
                          title={logo.name}
                          className="block opacity-80 transition-opacity hover:opacity-100"
                        >
                          {inner}
                        </a>
                      ) : (
                        inner
                      )}
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
