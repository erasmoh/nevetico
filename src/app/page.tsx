import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col">
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-4 py-24 text-center">
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          Plan Community gratis para comunidades tech y locales
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Eventos para tu comunidad, a tu manera.
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          Crea meetups y eventos con página personalizable, RSVP, check-in con QR
          y emails transaccionales. Sin costo para organizadores de comunidad.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
            Acceder
          </Button>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-4xl gap-4 px-4 pb-24 sm:grid-cols-3">
        {[
          { t: "Página por bloques", d: "Hero, agenda, sponsors, mapa y más. Ordena y personaliza." },
          { t: "RSVP + lista de espera", d: "Cupos, confirmación y waitlist automático." },
          { t: "Check-in con QR", d: "Escanea o busca asistentes al entrar." },
        ].map((f) => (
          <div key={f.t} className="rounded-lg border border-border p-5 text-left">
            <h3 className="font-medium">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
