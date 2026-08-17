import { BlockSection } from "./section";

export type FaqItem = { q?: string; a?: string };

export function FaqBlock({ title, items }: { title?: string; items?: FaqItem[] }) {
  const list = (items ?? []).filter((i) => i?.q);
  if (list.length === 0) return null;

  return (
    <BlockSection title={title ?? "Preguntas frecuentes"}>
      <div className="flex flex-col divide-y divide-border">
        {list.map((item, i) => (
          <details key={i} className="group py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {item.q}
              <span className="text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            {item.a ? (
              <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{item.a}</p>
            ) : null}
          </details>
        ))}
      </div>
    </BlockSection>
  );
}
