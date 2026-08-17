import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarEmailsNav } from "@/components/email/calendar-emails-nav";
import { ApiSettingsPanel } from "@/components/api/api-settings-panel";

export const metadata = { title: "API y webhooks" };

export default async function ApiSettingsPage({
  params,
}: PageProps<"/dashboard/calendars/[slug]/api">) {
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

  const { data: apiKeys } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, last_used_at, revoked_at")
    .eq("calendar_id", cal.id)
    .order("created_at", { ascending: false });

  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("id, url, events, enabled, secret")
    .eq("calendar_id", cal.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API y webhooks</h1>
        <p className="text-sm text-muted-foreground">{cal.name}</p>
      </div>

      <CalendarEmailsNav slug={slug} active="emails" />

      <ApiSettingsPanel
        calendarSlug={slug}
        apiKeys={(apiKeys ?? []).map((k) => ({
          id: k.id,
          name: k.name,
          key_prefix: k.key_prefix,
          last_used_at: k.last_used_at,
          revoked_at: k.revoked_at,
        }))}
        webhooks={(webhooks ?? []).map((w) => ({
          id: w.id,
          url: w.url,
          events: w.events as string[],
          enabled: w.enabled,
          secret: w.secret,
        }))}
      />
    </div>
  );
}
