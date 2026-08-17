import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BrandingForm } from "@/components/calendars/branding-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { parseTheme } from "@/lib/theme";
import {
  calendarOwnerPlan,
  entitlementsFor,
  PLAN_LABELS,
  type Plan,
} from "@/lib/entitlements";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const metadata = { title: "Ajustes de la comunidad" };

function siteHost(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    return new URL(raw).host;
  } catch {
    return raw;
  }
}

export default async function CalendarSettingsPage({
  params,
}: PageProps<"/dashboard/calendars/[slug]">) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?from=dashboard/calendars/${slug}`);

  const { data: calendar } = await supabase
    .from("calendars")
    .select("id, slug, name, description, theme, logo_url, cover_url, custom_domain")
    .eq("slug", slug)
    .maybeSingle();
  if (!calendar) notFound();

  const { data: membership } = await supabase
    .from("calendar_members")
    .select("role")
    .eq("calendar_id", calendar.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership || !["owner", "host"].includes(membership.role)) notFound();

  const plan = await calendarOwnerPlan(supabase, calendar.id);
  const ent = entitlementsFor(plan);
  const isCommunity = plan === "community";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          render={<Link href="/dashboard/calendars" />}
        >
          <ArrowLeft className="size-4" /> Mis comunidades
        </Button>
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          render={<Link href={`/c/${calendar.slug}`} target="_blank" />}
        >
          Ver página pública <ExternalLink className="size-4" />
        </Button>
      </div>

      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Plan {PLAN_LABELS[plan as Plan]}
            {isCommunity ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                Community
              </span>
            ) : null}
          </CardTitle>
          <CardDescription>
            Límites actuales de esta comunidad.{" "}
            {isCommunity
              ? "Para subir a Pro, escríbenos (el pricing se activa pronto)."
              : "Plan activo."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            <Limit
              label="Asistentes por evento"
              value={ent.maxAttendeesPerEvent ?? "ilimitado"}
            />
            <Limit
              label="Emails por mes"
              value={ent.maxEmailsPerMonth ?? "ilimitado"}
            />
            <Limit
              label="Hosts extra"
              value={ent.maxExtraHosts ?? "ilimitado"}
            />
            <Limit
              label="Sponsors"
              value={
                ent.sponsorTiersAllowed
                  ? "logos + tiers"
                  : `${ent.maxSponsorLogos ?? 0} logo`
              }
            />
            <Limit
              label="Dominio propio"
              value={ent.customDomainAllowed ? "sí" : "no"}
              blocked={isCommunity}
            />
            <Limit label="Powered by Nevetico" value="siempre visible" />
          </ul>
        </CardContent>
      </Card>

      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>{calendar.name}</CardTitle>
          <CardDescription>
            Branding y dominio propio de la página pública de la comunidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingForm
            slug={calendar.slug}
            theme={parseTheme(calendar.theme)}
            logoUrl={calendar.logo_url}
            coverUrl={calendar.cover_url}
            customDomain={calendar.custom_domain}
            siteHost={siteHost()}
          />
        </CardContent>
      </Card>

      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Emails y comunidad</CardTitle>
          <CardDescription>
            Campañas, segmentos, automatizaciones y dominio verificado para esta
            comunidad.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { href: `/dashboard/calendars/${calendar.slug}/emails`, label: "Campañas", desc: "Envía emails con bloques del page builder." },
              { href: `/dashboard/calendars/${calendar.slug}/segments`, label: "Segmentos", desc: "Audiencias reutilizables por evento o asistencia." },
              { href: `/dashboard/calendars/${calendar.slug}/automations`, label: "Automatizaciones", desc: "Emails automáticos al registrarse, antes y después." },
              { href: `/dashboard/calendars/${calendar.slug}/domains`, label: "Dominio verificado", desc: "Verifica tu dominio en Resend para tus envíos." },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex flex-col gap-1 rounded-lg border border-border p-3 hover:bg-muted/40"
              >
                <span className="text-sm font-medium">{l.label}</span>
                <span className="text-xs text-muted-foreground">{l.desc}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Limit({
  label,
  value,
  blocked,
}: {
  label: string;
  value: string | number;
  blocked?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          blocked
            ? "font-medium text-muted-foreground line-through"
            : "font-medium"
        }
      >
        {value}
      </span>
    </li>
  );
}
