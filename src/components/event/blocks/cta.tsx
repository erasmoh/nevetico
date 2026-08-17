export function CtaBlock({
  title,
  body,
  ctaLabel,
  ctaUrl,
  variant = "soft",
}: {
  title?: string;
  body?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  variant?: string;
}) {
  if (!title && !body) return null;
  const solid = variant === "solid";

  return (
    <section
      className={
        "flex flex-col items-start gap-3 rounded-xl p-6 sm:flex-row sm:items-center sm:justify-between " +
        (solid
          ? "bg-primary text-primary-foreground"
          : "border border-border bg-accent/50 text-accent-foreground")
      }
    >
      <div className="flex flex-col gap-1">
        {title ? <h2 className="font-heading text-lg font-semibold">{title}</h2> : null}
        {body ? (
          <p className={"text-sm " + (solid ? "opacity-90" : "text-muted-foreground")}>{body}</p>
        ) : null}
      </div>
      {ctaLabel ? (
        <a
          href={ctaUrl || "#rsvp"}
          target={ctaUrl ? "_blank" : undefined}
          rel={ctaUrl ? "noopener noreferrer" : undefined}
          className={
            "inline-flex shrink-0 items-center rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 " +
            (solid ? "bg-background text-foreground" : "bg-primary text-primary-foreground")
          }
        >
          {ctaLabel}
        </a>
      ) : null}
    </section>
  );
}
