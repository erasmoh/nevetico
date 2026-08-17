import { formatEventDay, formatEventTime } from "@/lib/datetime";

export function HeroBlock({
  title,
  subtitle,
  coverUrl,
  timezone,
  startsAt,
  ctaLabel,
  eyebrow,
  variant = "gradient",
}: {
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
  timezone: string;
  startsAt: string;
  ctaLabel?: string;
  eyebrow?: string;
  variant?: string;
}) {
  const isImage = variant === "image" && Boolean(coverUrl);
  const isMinimal = variant === "minimal";

  return (
    <section
      className={
        isMinimal
          ? "border-b border-border pb-6"
          : "relative overflow-hidden rounded-xl border border-border"
      }
    >
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : coverUrl && !isMinimal ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
      ) : null}

      <div
        className={
          isMinimal
            ? "flex flex-col gap-3"
            : isImage
              ? "relative flex min-h-72 flex-col justify-end gap-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 text-white sm:min-h-96 sm:p-10"
              : "relative flex flex-col gap-3 bg-gradient-to-b from-accent/70 via-muted/40 to-background p-6 sm:p-10"
        }
      >
        {eyebrow ? (
          <p
            className={
              "w-fit rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase " +
              (isImage ? "bg-white/20 text-white" : "bg-primary/10 text-primary")
            }
          >
            {eyebrow}
          </p>
        ) : null}
        <p className={"text-sm font-medium " + (isImage ? "text-white/80" : "text-muted-foreground")}>
          {formatEventDay(startsAt, timezone)} · {formatEventTime(startsAt, timezone)} {timezone}
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p
            className={
              "max-w-2xl text-balance " + (isImage ? "text-white/90" : "text-muted-foreground")
            }
          >
            {subtitle}
          </p>
        ) : null}
        {ctaLabel ? (
          <a
            href="#rsvp"
            className="mt-2 inline-flex w-fit items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            {ctaLabel}
          </a>
        ) : null}
      </div>
    </section>
  );
}
