import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createCampaign } from "@/app/actions/campaigns";
import { CalendarEmailsNav } from "@/components/email/calendar-emails-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

export const metadata = { title: "Campañas de email" };

export default async function CampaignsPage({
  params,
}: PageProps<"/dashboard/calendars/[slug]/emails">) {
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

  const { data: campaigns } = await supabase
    .from("email_campaigns")
    .select("id, name, subject, status, recipient_count, sent_at, scheduled_for, created_at")
    .eq("calendar_id", cal.id)
    .order("created_at", { ascending: false });

  const create = createCampaign.bind(null, slug);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emails</h1>
          <p className="text-sm text-muted-foreground">{cal.name}</p>
        </div>
        <form action={create}>
          <Button type="submit" size="sm">
            <Plus className="size-4" /> Nueva campaña
          </Button>
        </form>
      </div>

      <CalendarEmailsNav slug={slug} active="emails" />

      {(campaigns ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">Aún no hay campañas.</p>
          <Button className="mt-4" type="submit" formAction={create}>
            <Plus className="size-4" /> Crear campaña
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {(campaigns ?? []).map((c) => (
            <li key={c.id} className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/calendars/${slug}/emails/${c.id}`}
                  className="truncate font-medium hover:underline"
                >
                  {c.name}
                </Link>
                <p className="truncate text-sm text-muted-foreground">{c.subject}</p>
              </div>
              <Badge variant={c.status === "sent" ? "default" : "secondary"}>
                {statusLabel(c.status)}
              </Badge>
              {c.status === "sent" && c.recipient_count ? (
                <span className="text-sm text-muted-foreground">
                  {c.recipient_count} env.
                </span>
              ) : null}
              {c.status === "scheduled" && c.scheduled_for ? (
                <span className="text-sm text-muted-foreground">
                  {new Date(c.scheduled_for).toLocaleString("es-MX")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusLabel(s: string): string {
  return (
    {
      draft: "Borrador",
      scheduled: "Programada",
      sending: "Enviando",
      sent: "Enviada",
      canceled: "Cancelada",
    } as Record<string, string>
  )[s] ?? s;
}
