import { BlockSection } from "./section";

export type Speaker = {
  name?: string;
  role?: string;
  photo_url?: string;
  bio?: string;
  link?: string;
};

export function SpeakersBlock({
  title,
  items,
}: {
  title?: string;
  items?: Speaker[];
}) {
  const list = (items ?? []).filter((s) => s?.name);
  if (list.length === 0) return null;

  return (
    <BlockSection title={title ?? "Speakers"}>
      <ul className="grid gap-5 sm:grid-cols-2">
        {list.map((s, i) => {
          const initials = (s.name ?? "")
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? "")
            .join("");
          const card = (
            <>
              {s.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.photo_url}
                  alt={s.name ?? ""}
                  className="size-14 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {initials}
                </span>
              )}
              <span className="min-w-0">
                <span className="block font-medium">{s.name}</span>
                {s.role ? (
                  <span className="block text-sm text-muted-foreground">{s.role}</span>
                ) : null}
                {s.bio ? (
                  <span className="mt-1 block text-sm text-muted-foreground">{s.bio}</span>
                ) : null}
              </span>
            </>
          );
          return (
            <li key={i}>
              {s.link ? (
                <a
                  href={s.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 rounded-lg p-2 transition-colors hover:bg-muted/50"
                >
                  {card}
                </a>
              ) : (
                <div className="flex gap-4 p-2">{card}</div>
              )}
            </li>
          );
        })}
      </ul>
    </BlockSection>
  );
}
