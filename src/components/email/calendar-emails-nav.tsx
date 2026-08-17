import Link from "next/link";

/**
 * Navegación de la sección "Emails" de un calendario: Campañas, Segmentos,
 * Automatizaciones y Dominio. `active` resalta la pestaña actual.
 */
export function CalendarEmailsNav({
  slug,
  active,
}: {
  slug: string;
  active: "emails" | "segments" | "automations" | "domains";
}) {
  const tabs: { id: typeof active; label: string; href: string }[] = [
    { id: "emails", label: "Campañas", href: `/dashboard/calendars/${slug}/emails` },
    { id: "segments", label: "Segmentos", href: `/dashboard/calendars/${slug}/segments` },
    { id: "automations", label: "Automatizaciones", href: `/dashboard/calendars/${slug}/automations` },
    { id: "domains", label: "Dominio", href: `/dashboard/calendars/${slug}/domains` },
  ];
  return (
    <nav className="flex flex-wrap gap-1 border-b border-border">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href}
          className={
            "rounded-t-md -mb-px px-3 py-2 text-sm font-medium " +
            (active === t.id
              ? "border-x border-t border-border bg-background text-foreground"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
