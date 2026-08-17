import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { EventBlocks, type EventPublic } from "@/components/event/blocks";
import { RsvpForm } from "@/components/event/rsvp-form";
import { RegistrationStatus } from "@/components/event/registration-status";
import { formatEventDate } from "@/lib/datetime";
import { parseTheme, themeCss, themeModeClass, themeScope } from "@/lib/theme";

/**
 * Vista pública de un evento (comunitario o personal). Recibe el id validado
 * por la ruta y se encarga de cargar bloques, registro del usuario, conteo de
 * cupo y renderizar todo. El breadcrumb a la comunidad solo se muestra si el
 * evento pertenece a una.
 */
export async function EventPublicView({ eventId }: { eventId: string }) {
  const supabase = await createClient();

  const { data: rawEvent } = await supabase
    .from("events")
    .select(
      "id, slug, title, description, starts_at, ends_at, timezone, location_type, venue_name, address, online_url, capacity, status, cover_url, theme, calendar:calendars(id, slug, name)",
    )
    .eq("id", eventId)
    .maybeSingle();
  if (!rawEvent) notFound();

  const calendar = rawEvent.calendar as
    | { id: string; slug: string; name: string }
    | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: isOrganizerData } = await supabase.rpc("is_event_organizer", {
    ev_id: eventId,
  });
  const isOrganizer = Boolean(isOrganizerData);

  if (rawEvent.status !== "published" && !isOrganizer) notFound();

  const { data: blocks } = await supabase
    .from("page_blocks")
    .select("id, type, order_idx, visible, config")
    .eq("event_id", eventId)
    .order("order_idx", { ascending: true });

  type MyReg = { id: string; status: string };
  let myRegistration: MyReg | null = null;
  let qrDataUrl: string | null = null;
  if (user) {
    const { data: reg } = await supabase
      .from("registrations")
      .select("id, status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .neq("status", "canceled")
      .maybeSingle();
    myRegistration = (reg as MyReg | null) ?? null;
    if (myRegistration && myRegistration.status !== "waitlist") {
      try {
        qrDataUrl = await QRCode.toDataURL(myRegistration.id, {
          margin: 1,
          width: 200,
        });
      } catch {
        qrDataUrl = null;
      }
    }
  }

  const { count } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "going");
  const goingCount = count ?? 0;

  const eventPublic: EventPublic = {
    slug: rawEvent.slug ?? undefined,
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

  const isFull = rawEvent.capacity != null && goingCount >= rawEvent.capacity;

  const theme = parseTheme(rawEvent.theme);
  const scope = themeScope(eventId);

  return (
    <div
      data-nvt={scope}
      className={`mx-auto w-full max-w-5xl px-4 py-8 font-sans ${themeModeClass(theme)}`}
    >
      <style>{themeCss(scope, theme)}</style>
      {calendar ? (
        <p className="mb-4 text-sm text-muted-foreground">
          <Link href={`/c/${calendar.slug}`} className="hover:underline">
            {calendar.name}
          </Link>
        </p>
      ) : null}

      {rawEvent.status !== "published" ? (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          Vista previa — este evento está en borrador y no es visible al público.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <EventBlocks event={eventPublic} blocks={blocks ?? []} />

          {rawEvent.location_type !== "online" &&
          (rawEvent.venue_name || rawEvent.address) ? (
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
                  eventId={eventId}
                  status={myRegistration.status}
                  qrDataUrl={qrDataUrl}
                />
              ) : isFull ? (
                <div className="rounded-md border border-border bg-muted/40 px-3 py-3 text-sm">
                  El evento está lleno. Puedes unirte a la lista de espera:
                  <div className="mt-3">
                    <RsvpForm eventId={eventId} user={userProfile} />
                  </div>
                </div>
              ) : (
                <RsvpForm eventId={eventId} user={userProfile} />
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
