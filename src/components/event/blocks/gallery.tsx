import { BlockSection } from "./section";

export type GalleryImage = { src?: string; caption?: string };

const cols: Record<string, string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-3",
  "4": "sm:grid-cols-4",
};

export function GalleryBlock({
  title,
  columns,
  items,
}: {
  title?: string;
  columns?: string;
  items?: GalleryImage[];
}) {
  const list = (items ?? []).filter((i) => i?.src);
  if (list.length === 0) return null;

  return (
    <BlockSection title={title ?? "Galería"}>
      <div className={`grid grid-cols-2 gap-3 ${cols[columns ?? "3"] ?? cols["3"]}`}>
        {list.map((img, i) => (
          <figure key={i} className="overflow-hidden rounded-lg border border-border">
            <a href={img.src} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.caption ?? ""}
                loading="lazy"
                className="aspect-4/3 w-full object-cover transition-transform duration-200 hover:scale-105"
              />
            </a>
            {img.caption ? (
              <figcaption className="px-2 py-1.5 text-xs text-muted-foreground">
                {img.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </BlockSection>
  );
}
