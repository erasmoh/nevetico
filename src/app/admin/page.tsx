import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PricingToggle } from "@/components/admin/pricing-toggle";
import { ProfileAdminRow, EventAdminRow, VerificationAdminRow } from "@/components/admin/admin-rows";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_LABELS } from "@/lib/entitlements";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?from=admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect("/dashboard");

  // Flag de pricing.
  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "pricing_enabled")
    .maybeSingle();
  const pricingEnabled = !!(setting?.value as { pricing_enabled?: boolean } | null)
    ?.pricing_enabled;

  // Perfiles (con email desde auth.users no expuesto por RLS; usamos el email
  // del calendario owner como aproximación o dejamos display_name).
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, plan, is_admin, max_attendees_override")
    .order("created_at", { ascending: false });

  // Eventos con su calendario (para mostrar contexto) y conteo de going.
  const { data: events } = await supabase
    .from("events")
    .select(
      "id, title, slug, max_attendees_override, calendar:calendars(name), registrations(status)",
    )
    .order("starts_at", { ascending: false })
    .limit(100);

  const eventRows = (events ?? []).map((e) => {
    const cal = e.calendar as { name: string } | null;
    const regs = (e.registrations as { status: string }[]) ?? [];
    return {
      id: e.id,
      title: e.title,
      slug: e.slug,
      calendar_name: cal?.name ?? null,
      max_attendees_override: e.max_attendees_override,
      going_count: regs.filter((r) => r.status === "going").length,
    };
  });

  // Verificaciones Community pendientes + recientes (para revisión del admin).
  const { data: verifications } = await supabase
    .from("community_verifications")
    .select(
      "id, status, form_data, notes, submitted_at, calendar:calendars(name)",
    )
    .order("submitted_at", { ascending: false })
    .limit(50);

  const verifRows = (verifications ?? []).map((v) => {
    const cal = v.calendar as { name: string } | null;
    const form = v.form_data as {
      community_url?: string | null;
      description?: string | null;
    } | null;
    return {
      id: v.id,
      calendar_name: cal?.name ?? "—",
      status: v.status as "pending" | "approved" | "rejected" | "needs_info",
      description: form?.description ?? null,
      community_url: form?.community_url ?? null,
      submitted_at: v.submitted_at,
      notes: v.notes,
    };
  });

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
            <p className="text-sm text-muted-foreground">
              Panel global de Nevetico. Sin link público.
            </p>
          </div>
          <PricingToggle enabled={pricingEnabled} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Cuentas ({(profiles ?? []).length})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Perfil</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Asistentes (override)</th>
                  <th className="px-3 py-2">Admin</th>
                </tr>
              </thead>
              <tbody>
                {(profiles ?? []).map((p) => (
                  <ProfileAdminRow
                    key={p.id}
                    profile={{
                      id: p.id,
                      display_name: p.display_name,
                      plan: p.plan as keyof typeof PLAN_LABELS,
                      is_admin: p.is_admin,
                      max_attendees_override: p.max_attendees_override,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Eventos ({eventRows.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">Evento</th>
                  <th className="px-3 py-2">Asistentes (override)</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {eventRows.map((e) => (
                  <EventAdminRow key={e.id} event={e} />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Verificaciones Community ({verifRows.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {verifRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay verificaciones pendientes.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2">Comunidad</th>
                    <th className="px-3 py-2">Descripción</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {verifRows.map((v) => (
                    <VerificationAdminRow key={v.id} verification={v} />
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
