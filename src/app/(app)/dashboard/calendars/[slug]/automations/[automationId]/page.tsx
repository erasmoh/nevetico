import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AutomationBuilder } from "@/components/email/automation-builder";
import { CalendarEmailsNav } from "@/components/email/calendar-emails-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { StepType } from "@/lib/email/automation-types";

export const metadata = { title: "Editor de automatización" };

type Step = {
  type: StepType;
  subject?: string;
  blocks?: { type: string; config: Record<string, unknown> }[];
  delay_minutes?: number;
};

export default async function AutomationEditorPage({
  params,
}: PageProps<"/dashboard/calendars/[slug]/automations/[automationId]">) {
  const { slug, automationId } = await params;
  const supabase = await createClient();

  const { data: cal } = await supabase
    .from("calendars")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!cal) notFound();

  const { data: automation } = await supabase
    .from("automations")
    .select("id, name, trigger, enabled, steps, calendar_id")
    .eq("id", automationId)
    .maybeSingle();
  if (!automation || automation.calendar_id !== cal.id) notFound();

  const steps: Step[] = Array.isArray(automation.steps)
    ? (automation.steps as Step[]).map((s) => ({
        type: s.type,
        subject: s.subject,
        blocks: Array.isArray(s.blocks)
          ? (s.blocks as { type: string; config: Record<string, unknown> }[]).map((b) => ({
              type: b.type,
              config:
                b.config && typeof b.config === "object" && !Array.isArray(b.config)
                  ? (b.config as Record<string, unknown>)
                  : {},
            }))
          : [],
        delay_minutes: s.delay_minutes,
      }))
    : [];

  return (
    <div className="flex flex-col gap-4">
      <Button
        size="sm"
        variant="ghost"
        nativeButton={false}
        render={<Link href={`/dashboard/calendars/${slug}/automations`} />}
      >
        <ArrowLeft className="size-4" /> Volver a automatizaciones
      </Button>

      <CalendarEmailsNav slug={slug} active="automations" />

      <AutomationBuilder
        automationId={automation.id}
        calendarSlug={slug}
        initial={{
          name: automation.name,
          trigger: automation.trigger,
          enabled: automation.enabled,
          steps,
        }}
      />
    </div>
  );
}
