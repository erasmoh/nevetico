import { BlockSection } from "./section";

export function TextBlock({ title, body }: { title?: string; body?: string }) {
  if (!body?.trim()) return null;
  return (
    <BlockSection title={title}>
      <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
        {body
          .split(/\n{2,}/)
          .map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
      </div>
    </BlockSection>
  );
}
