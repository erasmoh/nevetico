import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Mis comunidades" };

export default async function CalendarsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?from=dashboard");

  const { data } = await supabase
    .from("calendar_members")
    .select("role, calendar:calendars(id, slug, name, description)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const calendars = (data ?? []).map((m) => ({
    role: m.role,
    ...(m.calendar as NonNullable<typeof m.calendar>),
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mis comunidades</h1>
        <p className="text-sm text-muted-foreground">
          Las comunidades que organizas o en las que colaboras.
        </p>
      </div>

      {calendars.length === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <p className="text-muted-foreground">No tienes comunidades todavía.</p>
          <Button
            className="mt-4"
            render={<Link href="/dashboard/calendars/new" />}
          >
            Crear comunidad
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {calendars.map((c) => (
            <li key={c.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/c/${c.slug}`}
                  className="font-medium hover:underline"
                >
                  {c.name}
                </Link>
                <Badge variant="secondary">{c.role}</Badge>
              </div>
              {c.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {c.description}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">/c/{c.slug}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
