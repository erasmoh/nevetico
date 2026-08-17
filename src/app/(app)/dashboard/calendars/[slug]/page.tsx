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
    </div>
  );
}
