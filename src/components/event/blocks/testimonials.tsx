import { BlockSection } from "./section";

export type Testimonial = {
  quote?: string;
  author?: string;
  role?: string;
  photo_url?: string;
};

export function TestimonialsBlock({
  title,
  items,
}: {
  title?: string;
  items?: Testimonial[];
}) {
  const list = (items ?? []).filter((t) => t?.quote);
  if (list.length === 0) return null;

  return (
    <BlockSection title={title ?? "Lo que dicen los asistentes"}>
      <ul className="grid gap-4 sm:grid-cols-2">
        {list.map((t, i) => (
          <li key={i} className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4">
            <p className="text-sm italic">“{t.quote}”</p>
            <div className="flex items-center gap-3">
              {t.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={t.photo_url}
                  alt={t.author ?? ""}
                  className="size-8 rounded-full object-cover"
                />
              ) : null}
              <span className="text-xs">
                <span className="block font-medium">{t.author}</span>
                {t.role ? <span className="block text-muted-foreground">{t.role}</span> : null}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </BlockSection>
  );
}
