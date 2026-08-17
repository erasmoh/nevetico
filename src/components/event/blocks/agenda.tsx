type AgendaItem = { time: string; title: string; speaker?: string };

export function AgendaBlock({ items }: { items?: AgendaItem[] }) {
  const list = items ?? [];
  if (list.length === 0) return null;
  return (
    <section className="rounded-xl border border-border p-6">
      <h2 className="mb-4 text-lg font-semibold">Agenda</h2>
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
    </section>
  );
}
