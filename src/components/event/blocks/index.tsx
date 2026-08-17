import type { Json } from "@/lib/database.types";
import { HeroBlock } from "./hero";
import { TextBlock } from "./text";
import { AgendaBlock } from "./agenda";
import { SpeakersBlock, type Speaker } from "./speakers";
import { SponsorsBlock, type SponsorTier } from "./sponsors";
import { GalleryBlock, type GalleryImage } from "./gallery";
import { VideoBlock } from "./video";
import { FaqBlock, type FaqItem } from "./faq";
import { MapBlock } from "./map";
import { CtaBlock } from "./cta";
import { CountdownBlock } from "./countdown";
import { TestimonialsBlock, type Testimonial } from "./testimonials";
import { CustomBlock } from "./custom";

export type PageBlockRow = {
  id: string;
  type: string;
  order_idx: number;
  visible?: boolean | null;
  config: Json;
};

export type EventPublic = {
  id: string;
  slug?: string;
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

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function list<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

/** Render de un bloque suelto: lo usan la página pública y la preview del builder. */
export function EventBlock({
  block,
  event,
}: {
  block: PageBlockRow;
  event: EventPublic;
}) {
  const cfg = asObject(block.config);

  switch (block.type) {
    case "hero":
      return (
        <HeroBlock
          title={event.title}
          subtitle={str(cfg.subtitle) ?? event.description ?? undefined}
          coverUrl={event.cover_url}
          timezone={event.timezone}
          startsAt={event.starts_at}
          ctaLabel={str(cfg.cta_label)}
          eyebrow={str(cfg.eyebrow)}
          variant={str(cfg.variant)}
        />
      );
    case "text":
      return <TextBlock title={str(cfg.title)} body={str(cfg.body)} />;
    case "agenda":
      return <AgendaBlock title={str(cfg.title)} items={list(cfg.items)} />;
    case "speakers":
      return <SpeakersBlock title={str(cfg.title)} items={list<Speaker>(cfg.items)} />;
    case "sponsors":
      return (
        <SponsorsBlock
          eventId={event.id}
          title={str(cfg.title)}
          note={str(cfg.note)}
          contactUrl={str(cfg.contact_url)}
          tiers={list<SponsorTier>(cfg.tiers)}
          eventSlug={event.slug}
        />
      );
    case "gallery":
      return (
        <GalleryBlock
          title={str(cfg.title)}
          columns={str(cfg.columns)}
          items={list<GalleryImage>(cfg.items)}
        />
      );
    case "video":
      return (
        <VideoBlock title={str(cfg.title)} src={str(cfg.src)} caption={str(cfg.caption)} />
      );
    case "faq":
      return <FaqBlock title={str(cfg.title)} items={list<FaqItem>(cfg.items)} />;
    case "map":
      return (
        <MapBlock
          title={str(cfg.title)}
          query={str(cfg.query)}
          venueName={event.venue_name}
          address={event.address}
        />
      );
    case "cta":
      return (
        <CtaBlock
          title={str(cfg.title)}
          body={str(cfg.body)}
          ctaLabel={str(cfg.cta_label)}
          ctaUrl={str(cfg.cta_url)}
          variant={str(cfg.variant)}
        />
      );
    case "countdown":
      return (
        <CountdownBlock
          title={str(cfg.title)}
          finishedLabel={str(cfg.finished_label)}
          startsAt={event.starts_at}
        />
      );
    case "testimonials":
      return (
        <TestimonialsBlock title={str(cfg.title)} items={list<Testimonial>(cfg.items)} />
      );
    case "custom":
      return (
        <CustomBlock
          title={str(cfg.title)}
          embedUrl={str(cfg.embed_url)}
          html={str(cfg.html)}
        />
      );
    default:
      return null;
  }
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
      {blocks
        .filter((b) => b.visible !== false)
        .map((b) => (
          <EventBlock key={b.id} block={b} event={event} />
        ))}
    </div>
  );
}
