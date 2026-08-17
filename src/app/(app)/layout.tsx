import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarDays, LayoutDashboard, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?from=dashboard");

  const { data: calendars } = await supabase
    .from("calendar_members")
    .select("calendar:calendars(id, slug, name)")
    .eq("user_id", user.id)
    .in("role", ["owner", "host"]);

  const myCalendars = (calendars ?? [])
    .map((c) => c.calendar)
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <div className="flex flex-col gap-6 sm:flex-row">
        <aside className="sm:w-56 sm:shrink-0">
          <nav className="flex flex-row flex-wrap gap-1 sm:flex-col sm:gap-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <LayoutDashboard className="size-4" /> Eventos
            </Link>
            <Link
              href="/dashboard/calendars"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <CalendarDays className="size-4" /> Comunidades
            </Link>
            {myCalendars.length > 0 ? (
              <div className="mt-2 hidden flex-col gap-1 sm:flex">
                <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">
                  Mis comunidades
                </p>
                {myCalendars.map((c) => (
                  <Link
                    key={c.id}
                    href={`/c/${c.slug}`}
                    className="truncate rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="mb-6 flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" render={<Link href="/dashboard/calendars/new" />}>
              <Plus className="size-4" /> Comunidad
            </Button>
            <Button size="sm" render={<Link href="/dashboard/events/new" />}>
              <Plus className="size-4" /> Evento
            </Button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
