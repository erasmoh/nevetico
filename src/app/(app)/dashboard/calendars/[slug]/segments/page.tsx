import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteSegment } from "@/app/actions/segments";
import { CalendarEmailsNav } from "@/components/email/calendar-emails-nav";
import { SegmentCreator } from "@/components/email/segment-creator";
import { DeleteButton } from "@/components/email/delete-button";
import { Badge } from "@/components/ui/badge";
import { SEGMENT_KINDS } from "@/lib/email/segment-types";

export const metadata = { title: "Segmentos" };

export default async function SegmentsPage({
  params,
}: PageProps<"/dashboard/calendars/[slug]/segments">) {
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

  const { data: segments } = await supabase
    .from("segments")
    .select("id, name, kind, config, created_at")
    .eq("calendar_id", cal.id)
    .order("created_at", { ascending: false });

  const { data: events } = await supabase
    .from("events")
    .select("id, title, starts_at")
    .eq("calendar_id", cal.id)
    .order("starts_at", { ascending: false })
    .limit(50);

  const kindLabel = (k: string) => SEGMENT_KINDS.find((s) => s.kind === k)?.label ?? k;
  const eventTitle = (eventId: string | null) =>
    (events ?? []).find((e) => e.id === eventId)?.title ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Segmentos</h1>
        <p className="text-sm text-muted-foreground">{cal.name}</p>
      </div>

      <CalendarEmailsNav slug={slug} active="segments" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <SegmentCreator calendarSlug={slug} events={(events ?? []).map((e) => ({
          id: e.id,
          title: e.title,
          starts_at: e.starts_at,
        }))} />

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Segmentos guardados</p>
          {(segments ?? []).length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Sin segmentos todavía.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
              {(segments ?? []).map((s) => {
                const cfg = s.config as { event_id?: string } | null;
                return (
                  <li key={s.id} className="flex items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {kindLabel(s.kind)}
                        {cfg?.event_id ? ` · ${eventTitle(cfg.event_id) ?? "evento"}` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary">{kindLabel(s.kind)}</Badge>
                    <DeleteButton action={deleteSegment.bind(null, s.id) as () => Promise<{ ok?: boolean; error?: string } | undefined>} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
