import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarEmailsNav } from "@/components/email/calendar-emails-nav";
import { DomainsPanel } from "@/components/email/domains-panel";

export const metadata = { title: "Dominio verificado" };

type DnsRecord = {
  record: string;
  type: string;
  name: string;
  value: string;
  status?: string;
  ttl?: number | string;
  priority?: number;
};

export default async function DomainsPage({
  params,
}: PageProps<"/dashboard/calendars/[slug]/domains">) {
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

  const { data: domains } = await supabase
    .from("verified_domains")
    .select("id, domain, status, resend_id, records, last_checked_at")
    .eq("calendar_id", cal.id)
    .order("created_at", { ascending: true });

  const list = (domains ?? []).map((d) => ({
    id: d.id,
    domain: d.domain,
    status: d.status,
    resend_id: d.resend_id,
    records: (Array.isArray(d.records) ? d.records : []) as DnsRecord[],
    last_checked_at: d.last_checked_at,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dominio verificado</h1>
        <p className="text-sm text-muted-foreground">{cal.name}</p>
      </div>

      <CalendarEmailsNav slug={slug} active="domains" />

      <DomainsPanel
        calendarSlug={slug}
        initial={list}
        resendEnabled={!!process.env.RESEND_API_KEY}
      />
    </div>
  );
}
