import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarEmailsNav } from "@/components/email/calendar-emails-nav";
import { AutomationCreator } from "@/components/email/automation-creator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AUTOMATION_TRIGGERS } from "@/lib/email/automation-types";

export const metadata = { title: "Automatizaciones" };

export default async function AutomationsPage({
  params,
}: PageProps<"/dashboard/calendars/[slug]/automations">) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: cal } = await supabase
    .from("calendars")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();
  if (!cal) notFound();
  const { data: isMember } = await supabase.rpc("is_calendar_member", {
    cal_id: cal.id,
    allowed_roles: ["owner", "host"],
  });
  if (!isMember) redirect("/dashboard/calendars");

  const { data: automations } = await supabase
    .from("automations")
    .select("id, name, trigger, enabled, steps, created_at")
    .eq("calendar_id", cal.id)
    .order("created_at", { ascending: false });

  const triggerLabel = (t: string) =>
    AUTOMATION_TRIGGERS.find((x) => x.id === t)?.label ?? t;
  const stepCount = (steps: unknown) => (Array.isArray(steps) ? steps.length : 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Automatizaciones</h1>
          <p className="text-sm text-muted-foreground">{cal.name}</p>
        </div>
        <AutomationCreator calendarSlug={slug} />
      </div>

      <CalendarEmailsNav slug={slug} active="automations" />

      {(automations ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">Sin automatizaciones.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Crea una para enviar emails automáticos al registrarse, antes del
            evento, después, etc.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {(automations ?? []).map((a) => (
            <li key={a.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <a
                  href={`/dashboard/calendars/${slug}/automations/${a.id}`}
                  className="truncate font-medium hover:underline"
                >
                  {a.name}
                </a>
                <p className="truncate text-sm text-muted-foreground">
                  {triggerLabel(a.trigger)} · {stepCount(a.steps)} paso(s)
                </p>
              </div>
              <Badge variant={a.enabled ? "default" : "secondary"}>
                {a.enabled ? "Activa" : "Pausada"}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={
                  <a href={`/dashboard/calendars/${slug}/automations/${a.id}`} />
                }
              >
                Editar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
