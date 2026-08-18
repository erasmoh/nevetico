import { notFound } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { EventBlocks, type EventPublic } from "@/components/event/blocks";
import { RsvpForm } from "@/components/event/rsvp-form";
import { RegistrationStatus } from "@/components/event/registration-status";
import { ShareButtons } from "@/components/event/share-buttons";
import { TicketCheckout } from "@/components/event/ticket-checkout";
import { formatEventDate } from "@/lib/datetime";
import { parseTheme, themeCss, themeModeClass, themeScope } from "@/lib/theme";
import { paymentsEnabled } from "@/lib/entitlements";

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

  // Cargar tickets para decidir si mostrar RSVP gratis o checkout de pago.
  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select(
      "id, name, price_cents, currency, capacity, description, active, min_per_order, max_per_order, sale_start, sale_end",
    )
    .eq("event_id", eventId)
    .order("order_idx", { ascending: true });

  const enabled = await paymentsEnabled();
  const paidTickets = (ticketTypes ?? []).filter(
    (t) => t.price_cents > 0 && t.active,
  );
  // Si hay tickets pagos y el pricing está encendido, mostramos checkout.
  // Si no, todo fluye como RSVP gratis (los tickets pagos se ignoran).
  const showCheckout = enabled && paidTickets.length > 0;

  const eventPublic: EventPublic = {
    id: eventId,
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

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const shareUrl =
    calendar && rawEvent.slug
      ? `${siteUrl}/c/${calendar.slug}/${rawEvent.slug}`
      : `${siteUrl}/e/${eventId}`;

  // JSON-LD structured data para SEO (Event schema de schema.org).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: rawEvent.title,
    description: rawEvent.description ?? undefined,
    startDate: rawEvent.starts_at,
    endDate: rawEvent.ends_at ?? undefined,
    url: shareUrl,
    image: rawEvent.cover_url ?? undefined,
    eventStatus:
      rawEvent.status === "published"
        ? "https://schema.org/EventScheduled"
        : "https://schema.org/EventCancelled",
    eventAttendanceMode:
      rawEvent.location_type === "online"
        ? "https://schema.org/OnlineEventAttendanceMode"
        : rawEvent.location_type === "hybrid"
          ? "https://schema.org/MixedEventAttendanceMode"
          : "https://schema.org/OfflineEventAttendanceMode",
    organizer: calendar
      ? { "@type": "Organization", name: calendar.name, url: `${siteUrl}/c/${calendar.slug}` }
      : { "@type": "Organization", name: "Nevetico" },
    location:
      rawEvent.location_type === "online"
        ? {
            "@type": "VirtualLocation",
            url: rawEvent.online_url ?? shareUrl,
          }
        : {
            "@type": "Place",
            name: rawEvent.venue_name ?? undefined,
            address: rawEvent.address ?? undefined,
          },
  };

  return (
    <div
      data-nvt={scope}
      className={`mx-auto w-full max-w-5xl px-4 py-8 font-sans ${themeModeClass(theme)}`}
    >
      <style>{themeCss(scope, theme)}</style>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
              ) : showCheckout ? (
                <TicketCheckout
                  eventId={eventId}
                  tickets={paidTickets.map((t) => ({
                    id: t.id,
                    name: t.name,
                    price_cents: t.price_cents,
                    currency: t.currency,
                    capacity: t.capacity,
                    description: t.description,
                    min_per_order: t.min_per_order,
                    max_per_order: t.max_per_order,
                  }))}
                  user={userProfile}
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

            {rawEvent.status === "published" ? (
              <div className="mt-4 border-t border-border pt-4">
                <ShareButtons
                  eventId={eventId}
                  url={shareUrl}
                  title={rawEvent.title}
                />
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
