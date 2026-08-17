import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Call for Papers" };

export default async function CfpDashboardPage({
  params,
}: PageProps<"/dashboard/events/[id]/cfp">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  const { data: isOrg } = await supabase.rpc("is_event_organizer", { ev_id: id });
  if (!isOrg) notFound();

  const { data: proposals } = await supabase
    .from("cfp_proposals")
    .select("id, title, abstract, format, duration_minutes, speaker_name, speaker_email, speaker_bio, status, created_at")
    .eq("event_id", id)
    .order("created_at", { ascending: false });

  const { data: eventSlug } = await supabase
    .from("events")
    .select("slug, calendar:calendars(slug)")
    .eq("id", id)
    .maybeSingle();
  const cal = eventSlug?.calendar as { slug: string } | null;
  const publicCfpUrl = cal?.slug && eventSlug?.slug
    ? `/c/${cal.slug}/${eventSlug.slug}/cfp`
    : `/e/${id}/cfp`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/dashboard/events/${id}`} />}>
          <ArrowLeft className="size-4" /> Volver al evento
        </Button>
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={publicCfpUrl} target="_blank" />}>
          Ver página pública del CFP
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Call for Papers</h1>
        <p className="text-sm text-muted-foreground">{event.title}</p>
      </div>

      {(proposals ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">Sin propuestas todavía.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Comparte el link público del CFP para que la comunidad envíe propuestas.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(proposals ?? []).map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <Badge variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                    {p.status === "approved" ? "Aprobada" : p.status === "rejected" ? "Rechazada" : "Pendiente"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {p.speaker_name} · {p.speaker_email} · {p.format}
                  {p.duration_minutes ? ` · ${p.duration_minutes}min` : ""}
                </p>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm">{p.abstract}</p>
                {p.speaker_bio ? (
                  <p className="text-xs text-muted-foreground">{p.speaker_bio}</p>
                ) : null}
                {p.status === "pending" ? (
                  <div className="flex gap-2">
                    <ApproveButton proposalId={p.id} />
                    <RejectButton proposalId={p.id} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { setProposalStatus } from "@/app/actions/cfp";
import { ProposalActionButton } from "@/components/events/proposal-action-button";

function ApproveButton({ proposalId }: { proposalId: string }) {
  return <ProposalActionButton action={() => setProposalStatus(proposalId, "approved")} label="Aprobar" variant="default" />;
}

function RejectButton({ proposalId }: { proposalId: string }) {
  return <ProposalActionButton action={() => setProposalStatus(proposalId, "rejected")} label="Rechazar" variant="outline" />;
}
