import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageBuilder, type BuilderBlock } from "@/components/builder/page-builder";
import { Button } from "@/components/ui/button";
import { parseTheme } from "@/lib/theme";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const metadata = { title: "Diseño de la página" };

export default async function EventDesignPage({
  params,
}: PageProps<"/dashboard/events/[id]/design">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id, slug, title, theme, calendar:calendars(slug)")
    .eq("id", id)
    .maybeSingle();
  if (!event) notFound();

  const { data: isOrganizer } = await supabase.rpc("is_event_organizer", {
    ev_id: id,
  });
  if (!isOrganizer) notFound();

  const { data: rawBlocks } = await supabase
    .from("page_blocks")
    .select("id, type, order_idx, visible, config")
    .eq("event_id", id)
    .order("order_idx", { ascending: true });

  const blocks: BuilderBlock[] = (rawBlocks ?? []).map((b) => ({
    id: b.id,
    type: b.type,
    order_idx: b.order_idx,
    visible: b.visible ?? true,
    config:
      b.config && typeof b.config === "object" && !Array.isArray(b.config)
        ? (b.config as Record<string, unknown>)
        : {},
  }));

  const calendar = event.calendar as { slug: string } | null;
  const publicPath =
    calendar && event.slug ? `/c/${calendar.slug}/${event.slug}` : `/e/${id}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          render={<Link href={`/dashboard/events/${id}`} />}
        >
          <ArrowLeft className="size-4" /> Volver al evento
        </Button>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={publicPath} target="_blank" />}
        >
          Ver página pública <ExternalLink className="size-4" />
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Diseño de la página
        </h1>
        <p className="text-sm text-muted-foreground">{event.title}</p>
      </div>

      <PageBuilder
        eventId={id}
        publicPath={publicPath}
        theme={parseTheme(event.theme)}
        blocks={blocks}
      />
    </div>
  );
}
