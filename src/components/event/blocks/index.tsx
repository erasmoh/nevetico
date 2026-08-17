import type { Json } from "@/lib/database.types";
import { HeroBlock } from "./hero";
import { AgendaBlock } from "./agenda";
import { MapBlock } from "./map";

export type PageBlockRow = {
  id: string;
  type: string;
  order_idx: number;
  config: Json;
};

export type EventPublic = {
  title: string;
  description: string | null;
  starts_at: string;
  timezone: string;
  cover_url: string | null;
  venue_name: string | null;
  address: string | null;
};

function asObject(config: Json): Record<string, unknown> {
  return config && typeof config === "object" && !Array.isArray(config)
    ? (config as Record<string, unknown>)
    : {};
}

export function EventBlocks({
  event,
  blocks,
}: {
  event: EventPublic;
  blocks: PageBlockRow[];
}) {
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((b) => {
        const cfg = asObject(b.config);
        switch (b.type) {
          case "hero":
            return (
              <HeroBlock
                key={b.id}
                title={event.title}
                subtitle={
                  typeof cfg.subtitle === "string" ? cfg.subtitle : (event.description ?? undefined)
                }
                coverUrl={event.cover_url}
                timezone={event.timezone}
                startsAt={event.starts_at}
                ctaLabel={typeof cfg.cta_label === "string" ? cfg.cta_label : undefined}
              />
            );
          case "agenda":
            return <AgendaBlock key={b.id} items={cfg.items as never} />;
          case "map":
            return (
              <MapBlock
                key={b.id}
                query={typeof cfg.query === "string" ? cfg.query : undefined}
                venueName={event.venue_name}
                address={event.address}
              />
            );
          // Bloques de Fase 2 (speakers, sponsors, gallery, video, faq, cta,
          // countdown, custom, form) se implementan después.
          default:
            return null;
        }
      })}
    </div>
  );
}
