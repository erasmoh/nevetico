import { createAdminClient } from "@/lib/supabase/admin";
import { verifyToken } from "@/lib/email/tracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Baja de suscripción" };

// Página pública de baja granular (por calendario). El link llega en los emails
// con un token firmado (HMAC del queue_id). Verificamos, sacamos el calendar y
// el destinatario de esa fila, y registramos la baja en `email_unsubscribes`.

export default async function UnsubscribePage({
  searchParams,
}: PageProps<"/email/unsubscribe">) {
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : Array.isArray(sp.t) ? sp.t[0] : undefined;
  const queueId = token ? verifyToken(token) : null;

  let ok = false;
  let email: string | null = null;
  let calendarName: string | null = null;
  let error = "El enlace de baja no es válido o ha expirado.";

  if (queueId) {
    try {
      const admin = createAdminClient();
      const { data: row } = await admin
        .from("email_queue")
        .select("id, to_email, calendar_id, campaign_id")
        .eq("id", queueId)
        .maybeSingle();
      if (row?.calendar_id) {
        const { data: cal } = await admin
          .from("calendars")
          .select("name")
          .eq("id", row.calendar_id)
          .maybeSingle();
        calendarName = cal?.name ?? null;
        email = row.to_email;
        await admin
          .from("email_unsubscribes")
          .upsert(
            { calendar_id: row.calendar_id, email: row.to_email.toLowerCase() },
            { onConflict: "calendar_id,email" },
          );
        // Registrar el evento de baja (cuenta en métricas de la campaña).
        await admin.from("email_events").insert({
          queue_id: row.id,
          calendar_id: row.calendar_id,
          campaign_id: row.campaign_id,
          event_type: "unsubscribed",
        });
        ok = true;
        error = "";
      }
    } catch {
      error = "No pudimos procesar tu baja ahora. Inténtalo más tarde.";
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Baja de suscripción</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {ok ? (
            <>
              <p className="text-foreground">
                Listo{email ? `, ${email}` : ""}. Ya no recibirás más correos de
                {calendarName ? ` ${calendarName}` : " esta comunidad"}.
              </p>
              <p className="text-muted-foreground">
                Si te habías registrado en un evento, tu registro no se cancela:
                solo dejamos de enviarte correos.
              </p>
            </>
          ) : (
            <p className="text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
