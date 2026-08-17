import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export const metadata = { title: "Verificar certificado" };

export const dynamic = "force-dynamic";

// Verificación pública de un certificado: muestra los datos y un sello de
// válido. El QR del certificado apunta aquí.

export default async function VerifyCertificatePage({
  params,
}: PageProps<"/verify/[token]">) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: cert } = await admin
    .from("certificates")
    .select("id, email, name, issued_at, event_id, token")
    .eq("token", token)
    .maybeSingle();
  if (!cert) notFound();

  const { data: event } = await admin
    .from("events")
    .select("title, starts_at, timezone, calendar:calendars(name)")
    .eq("id", cert.event_id)
    .maybeSingle();
  const ev = event as
    | {
        title: string;
        starts_at: string;
        timezone: string;
        calendar: { name: string } | null;
      }
    | null;

  // QR que apunta a esta misma página (para imprimir/escanear).
  const qrDataUrl = await QRCode.toDataURL(
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/verify/${cert.token}`,
    { width: 200, margin: 1 },
  );

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="size-7 text-emerald-600" />
          </div>
          <CardTitle>Certificado válido</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-center">
            <p className="text-lg font-semibold">{cert.name || "Asistente"}</p>
            <p className="text-sm text-muted-foreground">{cert.email}</p>
          </div>
          <div className="rounded-lg border border-border p-4 text-center">
            <p className="text-sm font-medium">{ev?.title ?? "Evento"}</p>
            <p className="text-xs text-muted-foreground">
              {ev?.calendar?.name ?? "Nevetico"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Emitido el{" "}
              {new Date(cert.issued_at).toLocaleDateString("es-MX", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR de verificación" width={120} height={120} />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Verifica la autenticidad escaneando el QR o comparando el token:
            <code className="ml-1 rounded bg-muted px-1.5 py-0.5">
              {cert.token.slice(0, 12)}…
            </code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
