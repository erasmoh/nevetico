/**
 * Diccionarios de traducción para las páginas públicas. El dashboard queda
 * en español (es el panel del organizador). El locale se resuelve desde una
 * cookie `locale` (default 'es') vía getLocale() en server y useLocale() en
 * client.
 *
 * Estructura plana con namespaces por punto (ej. "explore.title"). Así
 * avoids anidación compleja y es fácil de buscar.
 */

export type Locale = "es" | "en" | "pt";

export const LOCALES: Locale[] = ["es", "en", "pt"];
export const DEFAULT_LOCALE: Locale = "es";

export const LOCALE_LABELS: Record<Locale, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
};

type Dict = Record<string, string>;

const es: Dict = {
  "site.name": "Nevetico",
  "site.tagline": "Eventos para comunidades",

  "nav.explore": "Explorar",
  "nav.login": "Acceder",

  "home.badge": "Plan Community gratis para comunidades",
  "home.title": "Eventos para tu comunidad, a tu manera.",
  "home.title.highlight": "a tu manera.",
  "home.subtitle":
    "Crea meetups y eventos con una página personalizable, RSVP con lista de espera, check-in con QR y emails. Sin costo para quien organiza comunidad.",
  "home.cta.create": "Crear mi primer evento",
  "home.cta.how": "Ver cómo funciona",
  "home.check.1": "Sin contraseña",
  "home.check.2": "Sin código",
  "home.check.3": "Listo en minutos",

  "explore.title": "Explorar eventos",
  "explore.subtitle": "Meetups, conferencias y workshops de comunidades tech.",
  "explore.search": "Buscar evento…",
  "explore.city": "Ciudad",
  "explore.city.all": "Todas las ciudades",
  "explore.topic": "Tema",
  "explore.topic.all": "Todos los temas",
  "explore.when": "Cuándo",
  "explore.when.all": "Cualquier fecha",
  "explore.when.today": "Hoy",
  "explore.when.week": "Esta semana",
  "explore.when.month": "Este mes",
  "explore.when.past": "Pasados",
  "explore.empty": "No se encontraron eventos con esos filtros.",
  "explore.clear": "Limpiar filtros",
  "explore.page": "Página",
  "explore.page.of": "de",
  "explore.prev": "← Anterior",
  "explore.next": "Siguiente →",
  "explore.loc.online": "En línea",
  "explore.loc.hybrid": "Híbrido",
  "explore.loc.inperson": "Presencial",

  "event.rsvp": "Reservar lugar",
  "event.rsvp.rsvping": "Reservando…",
  "event.rsvp.name": "Nombre",
  "event.rsvp.email": "Correo",
  "event.rsvp.name.placeholder": "Tu nombre",
  "event.rsvp.email.placeholder": "tucorreo@ejemplo.com",
  "event.rsvp.as": "Registrándote como",
  "event.rsvp.waitlist":
    "Te añadimos a la lista de espera. Te avisaremos si hay lugar.",
  "event.rsvp.confirm":
    "¡Listo! Tu lugar está reservado. Revisa tu correo para la confirmación.",
  "event.rsvp.login": "¿Tienes cuenta? Inicia sesión para gestionar tus registros.",
  "event.full": "El evento está lleno. Puedes unirte a la lista de espera:",
  "event.confirmed": "confirmados",
  "event.full.badge": "lleno",

  "share.title": "Compartir",
  "share.copied": "Link copiado",
  "share.copy.fail": "No se pudo copiar",
  "share.story": "Imagen para IG Stories",
  "share.story.generating": "Generando…",
  "share.story.success":
    "Imagen descargada y link copiado. Súbela a tu story de IG.",

  "checkout.quantity": "Cantidad",
  "checkout.email": "Correo",
  "checkout.name": "Nombre (opcional)",
  "checkout.coupon": "Cupón (opcional)",
  "checkout.total": "Total",
  "checkout.buy": "Comprar",
  "checkout.buying": "Procesando…",
  "checkout.buy.entries": "entrada(s)",
  "checkout.stripe.note":
    "Serás redirigido a Stripe para completar el pago de forma segura.",
};

const en: Dict = {
  "site.name": "Nevetico",
  "site.tagline": "Events for communities",

  "nav.explore": "Explore",
  "nav.login": "Sign in",

  "home.badge": "Free Community plan for communities",
  "home.title": "Events for your community, your way.",
  "home.title.highlight": "your way.",
  "home.subtitle":
    "Create meetups and events with a customizable page, RSVP with waitlist, QR check-in and emails. Free for community organizers.",
  "home.cta.create": "Create my first event",
  "home.cta.how": "See how it works",
  "home.check.1": "No password",
  "home.check.2": "No code",
  "home.check.3": "Ready in minutes",

  "explore.title": "Explore events",
  "explore.subtitle": "Meetups, conferences and workshops from tech communities.",
  "explore.search": "Search events…",
  "explore.city": "City",
  "explore.city.all": "All cities",
  "explore.topic": "Topic",
  "explore.topic.all": "All topics",
  "explore.when": "When",
  "explore.when.all": "Any date",
  "explore.when.today": "Today",
  "explore.when.week": "This week",
  "explore.when.month": "This month",
  "explore.when.past": "Past",
  "explore.empty": "No events found with those filters.",
  "explore.clear": "Clear filters",
  "explore.page": "Page",
  "explore.page.of": "of",
  "explore.prev": "← Previous",
  "explore.next": "Next →",
  "explore.loc.online": "Online",
  "explore.loc.hybrid": "Hybrid",
  "explore.loc.inperson": "In person",

  "event.rsvp": "Reserve a spot",
  "event.rsvp.rsvping": "Reserving…",
  "event.rsvp.name": "Name",
  "event.rsvp.email": "Email",
  "event.rsvp.name.placeholder": "Your name",
  "event.rsvp.email.placeholder": "your@email.com",
  "event.rsvp.as": "Registering as",
  "event.rsvp.waitlist":
    "You're on the waitlist. We'll let you know if a spot opens up.",
  "event.rsvp.confirm":
    "You're in! Your spot is reserved. Check your email for confirmation.",
  "event.rsvp.login": "Have an account? Sign in to manage your registrations.",
  "event.full": "This event is full. You can join the waitlist:",
  "event.confirmed": "confirmed",
  "event.full.badge": "full",

  "share.title": "Share",
  "share.copied": "Link copied",
  "share.copy.fail": "Couldn't copy",
  "share.story": "IG Stories image",
  "share.story.generating": "Generating…",
  "share.story.success":
    "Image downloaded and link copied. Upload it to your IG story.",

  "checkout.quantity": "Quantity",
  "checkout.email": "Email",
  "checkout.name": "Name (optional)",
  "checkout.coupon": "Coupon (optional)",
  "checkout.total": "Total",
  "checkout.buy": "Buy",
  "checkout.buying": "Processing…",
  "checkout.buy.entries": "ticket(s)",
  "checkout.stripe.note":
    "You'll be redirected to Stripe to complete the payment securely.",
};

const pt: Dict = {
  "site.name": "Nevetico",
  "site.tagline": "Eventos para comunidades",

  "nav.explore": "Explorar",
  "nav.login": "Entrar",

  "home.badge": "Plano Community grátis para comunidades",
  "home.title": "Eventos para sua comunidade, do seu jeito.",
  "home.title.highlight": "do seu jeito.",
  "home.subtitle":
    "Crie meetups e eventos com uma página personalizável, RSVP com lista de espera, check-in com QR e emails. Grátis para quem organiza comunidade.",
  "home.cta.create": "Criar meu primeiro evento",
  "home.cta.how": "Ver como funciona",
  "home.check.1": "Sem senha",
  "home.check.2": "Sem código",
  "home.check.3": "Pronto em minutos",

  "explore.title": "Explorar eventos",
  "explore.subtitle": "Meetups, conferências e workshops de comunidades tech.",
  "explore.search": "Buscar eventos…",
  "explore.city": "Cidade",
  "explore.city.all": "Todas as cidades",
  "explore.topic": "Tema",
  "explore.topic.all": "Todos os temas",
  "explore.when": "Quando",
  "explore.when.all": "Qualquer data",
  "explore.when.today": "Hoje",
  "explore.when.week": "Esta semana",
  "explore.when.month": "Este mês",
  "explore.when.past": "Passados",
  "explore.empty": "Nenhum evento encontrado com esses filtros.",
  "explore.clear": "Limpar filtros",
  "explore.page": "Página",
  "explore.page.of": "de",
  "explore.prev": "← Anterior",
  "explore.next": "Próximo →",
  "explore.loc.online": "Online",
  "explore.loc.hybrid": "Híbrido",
  "explore.loc.inperson": "Presencial",

  "event.rsvp": "Reservar lugar",
  "event.rsvp.rsvping": "Reservando…",
  "event.rsvp.name": "Nome",
  "event.rsvp.email": "Email",
  "event.rsvp.name.placeholder": "Seu nome",
  "event.rsvp.email.placeholder": "seu@email.com",
  "event.rsvp.as": "Registrando como",
  "event.rsvp.waitlist":
    "Você está na lista de espera. Avisaremos se houver vaga.",
  "event.rsvp.confirm":
    "Pronto! Seu lugar está reservado. Verifique seu email para confirmação.",
  "event.rsvp.login": "Tem conta? Entre para gerenciar seus registros.",
  "event.full": "Este evento está cheio. Você pode entrar na lista de espera:",
  "event.confirmed": "confirmados",
  "event.full.badge": "cheio",

  "share.title": "Compartilhar",
  "share.copied": "Link copiado",
  "share.copy.fail": "Não foi possível copiar",
  "share.story": "Imagem para IG Stories",
  "share.story.generating": "Gerando…",
  "share.story.success":
    "Imagem baixada e link copiado. Publique no seu story do IG.",

  "checkout.quantity": "Quantidade",
  "checkout.email": "Email",
  "checkout.name": "Nome (opcional)",
  "checkout.coupon": "Cupom (opcional)",
  "checkout.total": "Total",
  "checkout.buy": "Comprar",
  "checkout.buying": "Processando…",
  "checkout.buy.entries": "ingresso(s)",
  "checkout.stripe.note":
    "Você será redirecionado ao Stripe para concluir o pagamento com segurança.",
};

export const DICTIONARIES: Record<Locale, Dict> = { es, en, pt };

/** Traduce una key en un locale dado. Fallback a es, luego a la key. */
export function translate(locale: Locale, key: string): string {
  return (
    DICTIONARIES[locale]?.[key] ??
    DICTIONARIES.es[key] ??
    DICTIONARIES.en[key] ??
    key
  );
}
