import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmailBuilder, type CampaignMetrics } from "@/components/email/email-builder";
import { CalendarEmailsNav } from "@/components/email/calendar-emails-nav";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Editor de campaña" };

type Block = { type: string; config: Record<string, unknown> };

export default async function CampaignEditorPage({
  params,
}: PageProps<"/dashboard/calendars/[slug]/emails/[campaignId]">) {
  const { slug, campaignId } = await params;
  const supabase = await createClient();

  const { data: cal } = await supabase
    .from("calendars")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!cal) notFound();

  const { data: campaign } = await supabase
    .from("email_campaigns")
    .select(
      "id, name, subject, preheader, blocks, segment_id, event_id, status, calendar_id",
    )
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign || campaign.calendar_id !== cal.id) notFound();

  const { data: segments } = await supabase
    .from("segments")
    .select("id, name, kind")
    .eq("calendar_id", cal.id)
    .order("created_at", { ascending: false });

  const { data: events } = await supabase
    .from("events")
    .select("id, title, starts_at")
    .eq("calendar_id", cal.id)
    .order("starts_at", { ascending: false })
    .limit(50);

  // Métricas (solo relevantes si ya se envió).
  let metrics: CampaignMetrics | null = null;
  if (campaign.status === "sent") {
    const { data: evRows } = await supabase
      .from("email_events")
      .select("event_type")
      .eq("campaign_id", campaign.id);
    const counts: Record<string, number> = {};
    for (const e of evRows ?? []) {
      counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;
    }
    metrics = {
      sent: counts["sent"] ?? 0,
      opened: counts["opened"] ?? 0,
      clicked: counts["clicked"] ?? 0,
      bounced: counts["bounced"] ?? 0,
      unsubscribed: counts["unsubscribed"] ?? 0,
    };
  }

  const blocks: Block[] = Array.isArray(campaign.blocks)
    ? (campaign.blocks as Block[]).map((b) => ({
        type: b.type,
        config:
          b.config && typeof b.config === "object" && !Array.isArray(b.config)
            ? (b.config as Record<string, unknown>)
            : {},
      }))
    : [];

  return (
    <div className="flex flex-col gap-4">
      <Button
        size="sm"
        variant="ghost"
        nativeButton={false}
        render={<Link href={`/dashboard/calendars/${slug}/emails`} />}
      >
        <ArrowLeft className="size-4" /> Volver a campañas
      </Button>

      <CalendarEmailsNav slug={slug} active="emails" />

      <EmailBuilder
        campaignId={campaign.id}
        calendarSlug={slug}
        initial={{
          name: campaign.name,
          subject: campaign.subject,
          preheader: campaign.preheader,
          blocks,
          segmentId: campaign.segment_id,
          eventId: campaign.event_id,
          status: campaign.status,
        }}
        segments={(segments ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          kind: s.kind,
        }))}
        events={(events ?? []).map((e) => ({
          id: e.id,
          title: e.title,
          starts_at: e.starts_at,
        }))}
        metrics={metrics}
      />
    </div>
  );
}
