import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CfpPublic } from "@/components/events/cfp-public";

export const metadata = { title: "Call for Papers" };

export default async function CalendarCfpPage({
  params,
}: PageProps<"/c/[calendarSlug]/[eventSlug]/cfp">) {
  const { calendarSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, status, calendar:calendars(slug)")
    .eq("slug", eventSlug)
    .eq("calendars.slug", calendarSlug)
    .maybeSingle();
  if (!event || event.status !== "published") notFound();

  const cal = event.calendar as { slug: string } | null;
  if (!cal || cal.slug !== calendarSlug) notFound();

  const { data: proposals } = await supabase
    .from("cfp_proposals")
    .select("id, title, abstract, format, duration_minutes, speaker_name, speaker_bio")
    .eq("event_id", event.id)
    .eq("status", "approved")
    .order("title", { ascending: true });

  let votedSet = new Set<string>();
  const approvedIds = (proposals ?? []).map((p) => p.id);
  if (approvedIds.length > 0) {
    const { data: votes } = await supabase
      .from("cfp_votes")
      .select("proposal_id")
      .in("proposal_id", approvedIds);
    votedSet = new Set((votes ?? []).map((v) => v.proposal_id));
  }

  const proposalsWithVotes = await Promise.all(
    (proposals ?? []).map(async (p) => {
      const { count } = await supabase
        .from("cfp_votes")
        .select("id", { count: "exact", head: true })
        .eq("proposal_id", p.id);
      return {
        id: p.id,
        title: p.title,
        abstract: p.abstract,
        format: p.format ?? "talk",
        duration_minutes: p.duration_minutes,
        speaker_name: p.speaker_name,
        speaker_bio: p.speaker_bio,
        votes: count ?? 0,
        voted: votedSet.has(p.id),
      };
    }),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Call for Papers</h1>
        <p className="text-sm text-muted-foreground">{event.title}</p>
      </div>
      <CfpPublic eventId={event.id} proposals={proposalsWithVotes} />
    </div>
  );
}
