import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { EventPreview } from "@/components/site/event-preview";
import {
  ArrowRight,
  Blocks,
  Ticket,
  QrCodeIcon,
  Mail,
  Users,
  Sparkles,
  Check,
  Clock,
  ShieldCheck,
  Heart,
  PartyPopper,
} from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col">
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid" />
        <div className="pointer-events-none absolute inset-0 bg-aurora" />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 pb-16 pt-16 sm:pt-24 lg:grid-cols-2 lg:items-center lg:gap-8 lg:pb-28 lg:pt-28">
          <div className="flex flex-col items-start gap-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="size-3.5 text-primary" />
              Plan Community gratis para comunidades
            </span>

            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Eventos para tu comunidad,{" "}
              <span className="text-gradient-brand">a tu manera.</span>
            </h1>

            <p className="max-w-xl text-pretty text-lg text-muted-foreground">
              Crea meetups y eventos con una página personalizable, RSVP con
              lista de espera, check-in con QR y emails. Sin costo para quien
              organiza comunidad.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
                Crear mi primer evento
                <ArrowRight className="size-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                nativeButton={false}
                render={
                  <a href="#como-funciona" />
                }
              >
                Ver cómo funciona
              </Button>
            </div>

            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-primary" /> Sin contraseña
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-primary" /> Sin código
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-primary" /> Listo en minutos
              </li>
            </ul>
          </div>

          <div className="relative animate-float-slow lg:justify-self-end">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/20 to-fuchsia-500/10 blur-2xl" />
            <EventPreview />
          </div>
        </div>
      </section>

      {/* ===================== FEATURES ===================== */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Todo lo que tu evento necesita
            </h2>
            <p className="mt-3 text-muted-foreground">
              De la página pública al check-in, en un solo lugar. Pensado para
              que organizar sea lo fácil.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Blocks,
                title: "Página por bloques",
                desc: "Hero, agenda, sponsors, mapa y más. Ordena y personaliza sin tocar código.",
              },
              {
                icon: Ticket,
                title: "RSVP + lista de espera",
                desc: "Cupos, confirmación al instante y waitlist automático cuando se llena.",
              },
              {
                icon: QrCodeIcon,
                title: "Check-in con QR",
                desc: "Cada asistente tiene su QR. Escanea o busca por nombre al llegar.",
              },
              {
                icon: Mail,
                title: "Emails transaccionales",
                desc: "Confirmación, recordatorios y agradecimiento. Listo para Resend.",
              },
              {
                icon: Users,
                title: "Comunidad, no solo evento",
                desc: "Tu calendario público con feed de próximos y pasados, y miembros.",
              },
              {
                icon: ShieldCheck,
                title: "Seguro por diseño",
                desc: "Row Level Security en cada tabla. Cada dato scoped a su comunidad.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CÓMO FUNCIONA ===================== */}
      <section id="como-funciona" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              De idea a evento en 3 pasos
            </h2>
            <p className="mt-3 text-muted-foreground">
              Sin curva de aprendizaje. Así de simple.
            </p>
          </div>

          <div className="relative mt-14 grid gap-8 md:grid-cols-3">
            <div className="hidden md:absolute md:left-0 md:right-0 md:top-7 md:h-px md:bg-gradient-to-r md:from-transparent md:via-border md:to-transparent" />
            {[
              {
                n: "1",
                icon: Users,
                title: "Crea tu comunidad",
                desc: "Un nombre y un slug. Tu calendario público queda vivo al instante.",
              },
              {
                n: "2",
                icon: PartyPopper,
                title: "Publica tu evento",
                desc: "Título, fecha y lugar. Se genera la página con hero y agenda por defecto.",
              },
              {
                n: "3",
                icon: QrCodeIcon,
                title: "Recibe y acredita",
                desc: "Comparte el link. Los RSVP llegan solos y el check-in es con QR.",
              },
            ].map((s) => (
              <div key={s.n} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 inline-flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-primary shadow-sm">
                  <s.icon className="size-6" />
                  <span className="absolute -right-2 -top-2 inline-flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {s.n}
                  </span>
                </div>
                <h3 className="mt-4 font-semibold">{s.title}</h3>
                <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
              Empezar ahora
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ===================== PLAN COMMUNITY ===================== */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Gratis para quien organiza comunidad
            </h2>
            <p className="mt-3 text-muted-foreground">
              Si tu comunidad no es comercial, no pagas nunca por lo básico. El
              volumen de comunidades gratis es nuestro canal de adquisición.
            </p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold">Community</h3>
              <p className="text-sm text-muted-foreground">Para meetups y comunidades</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight">
                $0<span className="text-base font-normal text-muted-foreground">/mes</span>
              </p>
              <ul className="mt-5 flex flex-col gap-2.5 text-sm">
                {["Eventos ilimitados", "Hasta 300 asistentes por evento", "3.000 emails/mes", "Todos los bloques", "Check-in con QR"].map(
                  (x) => (
                    <li key={x} className="inline-flex items-center gap-2">
                      <Check className="size-4 text-primary" /> {x}
                    </li>
                  ),
                )}
              </ul>
              <Button
                className="mt-6 w-full"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                Empezar gratis
              </Button>
            </div>

            <div className="relative rounded-2xl border-2 border-primary bg-card p-6 shadow-xl shadow-primary/10 lg:-mt-3 lg:mb-0">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Más popular
              </span>
              <h3 className="font-semibold">Pro</h3>
              <p className="text-sm text-muted-foreground">Para quien vende tickets</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight">
                $29<span className="text-base font-normal text-muted-foreground">/mes</span>
              </p>
              <ul className="mt-5 flex flex-col gap-2.5 text-sm">
                {["Asistentes ilimitados", "25.000 emails/mes", "Custom HTML/CSS en landing", "Sponsors: tiers + portal", "Dominio propio"].map(
                  (x) => (
                    <li key={x} className="inline-flex items-center gap-2">
                      <Check className="size-4 text-primary" /> {x}
                    </li>
                  ),
                )}
              </ul>
              <Button
                variant="outline"
                className="mt-6 w-full"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                Próximamente
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold">Business</h3>
              <p className="text-sm text-muted-foreground">Conferencias y empresas</p>
              <p className="mt-4 text-4xl font-semibold tracking-tight">
                $149<span className="text-base font-normal text-muted-foreground">/mes</span>
              </p>
              <ul className="mt-5 flex flex-col gap-2.5 text-sm">
                {["150.000 emails/mes", "White-label total", "Checkout de paquetes de sponsorship", "Equipo ilimitado + SSO", "Soporte prioritario"].map(
                  (x) => (
                    <li key={x} className="inline-flex items-center gap-2">
                      <Check className="size-4 text-primary" /> {x}
                    </li>
                  ),
                )}
              </ul>
              <Button
                variant="outline"
                className="mt-6 w-full"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                Próximamente
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== TESTIMONIAL / PRUEBA SOCIAL ===================== */}
      <section>
        <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:py-24">
          <figure className="relative rounded-3xl border border-border bg-card p-8 sm:p-12">
            <div className="absolute -top-4 left-8 text-7xl leading-none text-primary/30 select-none">
              &ldquo;
            </div>
            <blockquote className="text-pretty text-xl font-medium tracking-tight sm:text-2xl">
              Cambiamos Luma por Nevetico para el meetup mensual. La página se
              siente nuestra, el check-in con QR nos ahorra 20 minutos en cada
              entrada, y no pagamos nada.
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-sm font-semibold text-primary-foreground">
                MR
              </div>
              <div>
                <p className="text-sm font-semibold">María Rodríguez</p>
                <p className="text-sm text-muted-foreground">
                  Organizadora · Tech Meetup CDMX
                </p>
              </div>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* ===================== CTA FINAL ===================== */}
      <section className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-fuchsia-500/10 p-8 text-center sm:p-14">
            <div className="pointer-events-none absolute inset-0 bg-aurora opacity-60" />
            <div className="relative">
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Tu próximo evento, listo esta semana
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Crea tu comunidad, publica el evento y comparte el link. Te
                mandamos un enlace de acceso por correo y listo.
              </p>
              <div className="mt-7 flex justify-center">
                <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
                  <Heart className="size-4" /> Crear mi comunidad
                </Button>
              </div>
              <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> Sin tarjeta de crédito · Plan
                Community gratis para siempre
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== FOOTER ===================== */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold">
              N
            </span>
            <span className="font-medium text-foreground">Nevetico</span>
          </div>
          <p>Eventos para comunidades. Plan Community gratis.</p>
        </div>
      </footer>
    </div>
  );
}
