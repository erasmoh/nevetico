import { BlockSection } from "./section";

type AgendaItem = { time?: string; title?: string; speaker?: string };

export function AgendaBlock({
  title,
  items,
}: {
  title?: string;
  items?: AgendaItem[];
}) {
  const list = (items ?? []).filter((i) => i?.title || i?.time);
  if (list.length === 0) return null;
  return (
    <BlockSection title={title ?? "Agenda"}>
      <ol className="flex flex-col divide-y divide-border">
        {list.map((item, i) => (
          <li key={i} className="flex gap-4 py-3">
            <span className="w-20 shrink-0 font-mono text-sm text-muted-foreground">
              {item.time}
            </span>
            <span className="flex-1">
              <span className="font-medium">{item.title}</span>
              {item.speaker ? (
                <span className="block text-sm text-muted-foreground">{item.speaker}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </BlockSection>
  );
}
