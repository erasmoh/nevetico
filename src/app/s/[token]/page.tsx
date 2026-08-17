import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySponsorToken } from "@/lib/sponsor-portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Portal del sponsor" };

export const dynamic = "force-dynamic";

// Portal privado del sponsor: ve sus impresiones y clicks en el evento.
// El link se comparte con el token firmado.

export default async function SponsorPortalPage({
  params,
}: PageProps<"/s/[token]">) {
  const { token } = await params;
  const decoded = verifySponsorToken(token);
  if (!decoded) notFound();

  const { eventId, sponsorName } = decoded;
  const admin = createAdminClient();

  const { data: event } = await admin
    .from("events")
    .select("id, title, starts_at, timezone, calendar:calendars(name)")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) notFound();

  const ev = event as {
    id: string;
    title: string;
    starts_at: string;
    timezone: string;
    calendar: { name: string } | null;
  };

  const { data: stats } = await admin
    .from("sponsor_stats")
    .select("stat_date, impressions, clicks")
    .eq("event_id", eventId)
    .eq("sponsor_name", sponsorName)
    .order("stat_date", { ascending: true });

  const rows = stats ?? [];
  const totalImpressions = rows.reduce((s, r) => s + r.impressions, 0);
  const totalClicks = rows.reduce((s, r) => s + r.clicks, 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Portal del sponsor</p>
        <h1 className="text-2xl font-semibold tracking-tight">{sponsorName}</h1>
        <p className="text-sm text-muted-foreground">
          {ev.title} · {ev.calendar?.name ?? "Evento personal"}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Impresiones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalImpressions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalClicks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              CTR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{ctr}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Desglose por día</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin datos todavía. Las impresiones y clicks se registran cuando
              los asistentes ven la página del evento.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1 pr-3">Fecha</th>
                  <th className="py-1 pr-3">Impresiones</th>
                  <th className="py-1">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-1 pr-3">
                      {new Date(r.stat_date).toLocaleDateString("es-MX")}
                    </td>
                    <td className="py-1 pr-3">{r.impressions}</td>
                    <td className="py-1">{r.clicks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
