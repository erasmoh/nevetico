import type { PageTheme } from "@/lib/theme";

/**
 * Plantillas prehechas: un set de bloques (con contenido de ejemplo) más un
 * tema. Aplicarlas reemplaza los bloques actuales del evento.
 */
export type PageTemplate = {
  id: string;
  label: string;
  description: string;
  theme: PageTheme;
  blocks: { type: string; config: Record<string, unknown> }[];
};

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "meetup",
    label: "Meetup",
    description: "Portada, agenda, speakers, sponsors y mapa. Lo típico de un meetup mensual.",
    theme: { preset: "nevetico", font: "grotesk", radius: 0.75, mode: "auto" },
    blocks: [
      {
        type: "hero",
        config: {
          variant: "gradient",
          eyebrow: "Meetup",
          cta_label: "Reservar lugar",
        },
      },
      {
        type: "agenda",
        config: {
          title: "Agenda",
          items: [
            { time: "18:30", title: "Registro y pizza" },
            { time: "19:00", title: "Charla 1", speaker: "Por confirmar" },
            { time: "19:45", title: "Charla 2", speaker: "Por confirmar" },
            { time: "20:30", title: "Networking" },
          ],
        },
      },
      { type: "speakers", config: { title: "Speakers", items: [] } },
      {
        type: "sponsors",
        config: {
          title: "Sponsors",
          note: "¿Quieres patrocinar la próxima edición?",
          tiers: [{ name: "Community", size: "md", logos: [] }],
        },
      },
      { type: "map", config: { title: "Cómo llegar" } },
      {
        type: "faq",
        config: {
          title: "Preguntas frecuentes",
          items: [
            { q: "¿Tiene costo?", a: "No, es gratis. Solo regístrate para reservar tu lugar." },
            { q: "¿Habrá grabación?", a: "Sí, publicamos las charlas después del evento." },
          ],
        },
      },
    ],
  },
  {
    id: "conference",
    label: "Conferencia",
    description: "Portada a sangre, countdown, tracks, speakers, tiers de sponsors, galería y FAQ.",
    theme: { preset: "ocean", font: "display", radius: 0.5, mode: "auto" },
    blocks: [
      {
        type: "hero",
        config: { variant: "image", eyebrow: "Conferencia", cta_label: "Conseguir mi lugar" },
      },
      { type: "countdown", config: { title: "Faltan", finished_label: "¡Estamos en vivo!" } },
      { type: "text", config: { title: "Sobre la conferencia", body: "" } },
      {
        type: "agenda",
        config: {
          title: "Programa",
          items: [
            { time: "09:00", title: "Registro" },
            { time: "10:00", title: "Keynote de apertura", speaker: "Por confirmar" },
            { time: "11:30", title: "Track A / Track B" },
            { time: "13:30", title: "Comida" },
            { time: "17:00", title: "Cierre" },
          ],
        },
      },
      { type: "speakers", config: { title: "Speakers", items: [] } },
      {
        type: "sponsors",
        config: {
          title: "Sponsors",
          note: "Descarga el brochure de patrocinios.",
          tiers: [
            { name: "Platinum", size: "lg", logos: [] },
            { name: "Gold", size: "md", logos: [] },
            { name: "Community", size: "sm", logos: [] },
          ],
        },
      },
      { type: "gallery", config: { title: "Ediciones pasadas", columns: "3", items: [] } },
      { type: "testimonials", config: { title: "Lo que dicen los asistentes", items: [] } },
      { type: "map", config: { title: "Sede" } },
      { type: "faq", config: { title: "Preguntas frecuentes", items: [] } },
    ],
  },
  {
    id: "workshop",
    label: "Workshop",
    description: "Enfocado en aprender: requisitos, temario, instructor y cupo limitado.",
    theme: { preset: "forest", font: "sans", radius: 0.9, mode: "auto" },
    blocks: [
      { type: "hero", config: { variant: "minimal", eyebrow: "Workshop", cta_label: "Apartar mi cupo" } },
      {
        type: "text",
        config: {
          title: "Qué vas a aprender",
          body: "Al terminar el workshop vas a poder…",
        },
      },
      {
        type: "text",
        config: {
          title: "Requisitos",
          body: "Trae tu laptop con Node 22 y Docker instalados.",
        },
      },
      { type: "agenda", config: { title: "Temario", items: [] } },
      { type: "speakers", config: { title: "Instructor", items: [] } },
      { type: "map", config: { title: "Ubicación" } },
      {
        type: "faq",
        config: {
          title: "Preguntas frecuentes",
          items: [{ q: "¿Necesito experiencia previa?", a: "" }],
        },
      },
    ],
  },
  {
    id: "hackathon",
    label: "Hackathon",
    description: "Countdown, premios, reglas, mentores, sponsors y CFP de proyectos.",
    theme: { preset: "candy", font: "grotesk", radius: 1.1, mode: "dark" },
    blocks: [
      { type: "hero", config: { variant: "gradient", eyebrow: "Hackathon", cta_label: "Registrar equipo" } },
      { type: "countdown", config: { title: "Arranca en", finished_label: "¡A hackear!" } },
      { type: "text", config: { title: "El reto", body: "" } },
      { type: "text", config: { title: "Premios", body: "1° lugar · 2° lugar · 3° lugar" } },
      { type: "agenda", config: { title: "Cronograma", items: [] } },
      { type: "speakers", config: { title: "Mentores y jurado", items: [] } },
      {
        type: "sponsors",
        config: { title: "Sponsors", tiers: [{ name: "Sponsors", size: "md", logos: [] }] },
      },
      {
        type: "cta",
        config: {
          variant: "solid",
          title: "¿Quieres ser mentor?",
          body: "Buscamos mentores de producto, backend y diseño.",
          cta_label: "Postularme",
        },
      },
      { type: "map", config: { title: "Sede" } },
      { type: "faq", config: { title: "Reglas y FAQ", items: [] } },
    ],
  },
];

export function templateById(id: string): PageTemplate | undefined {
  return PAGE_TEMPLATES.find((t) => t.id === id);
}
