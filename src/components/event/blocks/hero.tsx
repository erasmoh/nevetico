import { formatEventDay, formatEventTime } from "@/lib/datetime";

export function HeroBlock({
  title,
  subtitle,
  coverUrl,
  timezone,
  startsAt,
  ctaLabel,
}: {
  title: string;
  subtitle?: string;
  coverUrl?: string | null;
  timezone: string;
  startsAt: string;
  ctaLabel?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-border">
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
      ) : null}
      <div className="relative flex flex-col gap-3 bg-gradient-to-b from-muted/60 to-background p-6 sm:p-10">
        <p className="text-sm font-medium text-muted-foreground">
          {formatEventDay(startsAt, timezone)} · {formatEventTime(startsAt, timezone)}{" "}
          {timezone}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle ? (
          <p className="max-w-2xl text-balance text-muted-foreground">{subtitle}</p>
        ) : null}
        {ctaLabel ? (
          <a
            href="#rsvp"
            className="mt-2 inline-flex w-fit items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            {ctaLabel}
          </a>
        ) : null}
      </div>
    </section>
  );
}
