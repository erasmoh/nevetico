import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EventBlocks, type EventPublic } from "@/components/event/blocks";
import { RsvpForm } from "@/components/event/rsvp-form";
import { RegistrationStatus } from "@/components/event/registration-status";
import { formatEventDate } from "@/lib/datetime";

export async function generateMetadata({
  params,
}: PageProps<"/c/[calendarSlug]/[eventSlug]">): Promise<Metadata> {
  const { calendarSlug, eventSlug } = await params;
  const supabase = await createClient();
  const { data: cal } = await supabase
    .from("calendars")
    .select("id")
    .eq("slug", calendarSlug)
    .maybeSingle();
  if (!cal) return { title: "Evento no encontrado" };
  const { data: ev } = await supabase
    .from("events")
    .select("title, description, status")
    .eq("calendar_id", cal.id)
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev || ev.status !== "published") return { title: "Evento no encontrado" };
  return {
    title: ev.title,
    description: ev.description ?? undefined,
    openGraph: { title: ev.title, description: ev.description ?? undefined },
  };
}

export default async function EventPage({
  params,
}: PageProps<"/c/[calendarSlug]/[eventSlug]">) {
  const { calendarSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: calendar } = await supabase
    .from("calendars")
    .select("id, slug, name, description")
    .eq("slug", calendarSlug)
    .maybeSingle();
  if (!calendar) notFound();

  const { data: rawEvent } = await supabase
    .from("events")
    .select(
      "id, title, description, starts_at, ends_at, timezone, location_type, venue_name, address, online_url, capacity, status, cover_url",
    )
    .eq("calendar_id", calendar.id)
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!rawEvent) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: isMember } = await supabase.rpc("is_calendar_member", {
    cal_id: calendar.id,
  });
  const isOrganizer = Boolean(isMember);

  // Si no está publicado y el visitante no es organizador → 404.
  if (rawEvent.status !== "published" && !isOrganizer) notFound();

  const { data: blocks } = await supabase
    .from("page_blocks")
    .select("id, type, order_idx, config")
    .eq("event_id", rawEvent.id)
    .order("order_idx", { ascending: true });

  // Registro activo del usuario actual (si hay).
  type MyReg = { id: string; status: string };
  let myRegistration: MyReg | null = null;
  let qrDataUrl: string | null = null;
  if (user) {
    const { data: reg } = await supabase
      .from("registrations")
      .select("id, status")
      .eq("event_id", rawEvent.id)
      .eq("user_id", user.id)
      .neq("status", "canceled")
      .maybeSingle();
    myRegistration = (reg as MyReg | null) ?? null;
    if (myRegistration && myRegistration.status !== "waitlist") {
      try {
        qrDataUrl = await QRCode.toDataURL(myRegistration.id, { margin: 1, width: 200 });
      } catch {
        qrDataUrl = null;
      }
    }
  }

  // Conteo de confirmados (para mostrar cupo).
  let goingCount = 0;
  const { count } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", rawEvent.id)
    .eq("status", "going");
  goingCount = count ?? 0;

  const eventPublic: EventPublic = {
    title: rawEvent.title,
    description: rawEvent.description,
    starts_at: rawEvent.starts_at,
    timezone: rawEvent.timezone,
    cover_url: rawEvent.cover_url,
    venue_name: rawEvent.venue_name,
    address: rawEvent.address,
  };

  const userProfile = user
    ? {
        email: user.email ?? "",
        name: (user.user_metadata?.display_name as string | undefined) ?? null,
      }
    : null;

  const isFull =
    rawEvent.capacity != null && goingCount >= rawEvent.capacity;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <p className="mb-4 text-sm text-muted-foreground">
        <Link href={`/c/${calendar.slug}`} className="hover:underline">
          {calendar.name}
        </Link>
      </p>

      {rawEvent.status !== "published" ? (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Vista previa — este evento está en borrador y no es visible al público.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <EventBlocks event={eventPublic} blocks={(blocks ?? []) as never} />

          {rawEvent.location_type !== "online" && (rawEvent.venue_name || rawEvent.address) ? (
            <div className="mt-5 rounded-lg border border-border p-4 text-sm">
              <p className="font-medium">{rawEvent.venue_name}</p>
              {rawEvent.address ? (
                <p className="text-muted-foreground">{rawEvent.address}</p>
              ) : null}
            </div>
          ) : null}

          {rawEvent.online_url ? (
            <div className="mt-5 rounded-lg border border-border p-4 text-sm">
              <p className="font-medium">En línea</p>
              <a
                href={rawEvent.online_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Unirse a la reunión
              </a>
            </div>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border p-5">
            <p className="text-sm font-medium">
              {formatEventDate(rawEvent.starts_at, rawEvent.timezone)}
            </p>
            <p className="text-xs text-muted-foreground">{rawEvent.timezone}</p>

            {rawEvent.capacity ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {goingCount}/{rawEvent.capacity} confirmados
                {isFull ? " · lleno" : ""}
              </p>
            ) : null}

            <div className="mt-4 border-t border-border pt-4">
              {myRegistration ? (
                <RegistrationStatus
                  eventId={rawEvent.id}
                  status={myRegistration.status}
                  qrDataUrl={qrDataUrl}
                />
              ) : isFull ? (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-3 text-sm">
                  El evento está lleno. Puedes unirte a la lista de espera:
                  <div className="mt-3">
                    <RsvpForm eventId={rawEvent.id} user={userProfile} />
                  </div>
                </div>
              ) : (
                <RsvpForm eventId={rawEvent.id} user={userProfile} />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
