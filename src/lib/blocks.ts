/**
 * Catálogo de bloques del page builder: qué campos tiene cada tipo y sus
 * valores por defecto. Se usa tanto en el editor (para pintar el formulario)
 * como en las plantillas. Los componentes de render viven en
 * `src/components/event/blocks`.
 */

export type FieldDef =
  | { name: string; label: string; kind: "text"; placeholder?: string; help?: string }
  | { name: string; label: string; kind: "textarea"; placeholder?: string; help?: string }
  | { name: string; label: string; kind: "url"; placeholder?: string; help?: string }
  | {
      name: string;
      label: string;
      kind: "select";
      options: { value: string; label: string }[];
      help?: string;
    }
  | {
      name: string;
      label: string;
      kind: "items";
      itemLabel: string;
      fields: FieldDef[];
      help?: string;
    };

export type BlockDef = {
  type: string;
  label: string;
  description: string;
  fields: FieldDef[];
  defaults: Record<string, unknown>;
};

const text = (name: string, label: string, placeholder?: string): FieldDef => ({
  name,
  label,
  kind: "text",
  placeholder,
});

const url = (name: string, label: string, placeholder?: string): FieldDef => ({
  name,
  label,
  kind: "url",
  placeholder,
});

export const BLOCK_DEFS: BlockDef[] = [
  {
    type: "hero",
    label: "Portada",
    description: "Título, fecha, imagen y botón principal.",
    fields: [
      {
        name: "variant",
        label: "Estilo",
        kind: "select",
        options: [
          { value: "gradient", label: "Degradado" },
          { value: "image", label: "Imagen a sangre" },
          { value: "minimal", label: "Minimal" },
        ],
      },
      { name: "subtitle", label: "Subtítulo", kind: "textarea" },
      text("cta_label", "Texto del botón", "Reservar lugar"),
      text("eyebrow", "Etiqueta superior", "Meetup mensual"),
    ],
    defaults: { variant: "gradient", cta_label: "Reservar lugar" },
  },
  {
    type: "text",
    label: "Texto",
    description: "Un bloque de texto libre con título opcional.",
    fields: [
      text("title", "Título", "Sobre el evento"),
      { name: "body", label: "Contenido", kind: "textarea" },
    ],
    defaults: { title: "Sobre el evento", body: "" },
  },
  {
    type: "agenda",
    label: "Agenda",
    description: "Programa por horas con ponente opcional.",
    fields: [
      text("title", "Título", "Agenda"),
      {
        name: "items",
        label: "Bloques de la agenda",
        kind: "items",
        itemLabel: "Punto",
        fields: [
          text("time", "Hora", "19:00"),
          text("title", "Título", "Registro y networking"),
          text("speaker", "Ponente"),
        ],
      },
    ],
    defaults: { title: "Agenda", items: [] },
  },
  {
    type: "speakers",
    label: "Speakers",
    description: "Ponentes con foto, cargo y redes.",
    fields: [
      text("title", "Título", "Speakers"),
      {
        name: "items",
        label: "Ponentes",
        kind: "items",
        itemLabel: "Speaker",
        fields: [
          text("name", "Nombre"),
          text("role", "Cargo / empresa"),
          url("photo_url", "Foto (URL)"),
          { name: "bio", label: "Bio corta", kind: "textarea" },
          url("link", "Link (web, LinkedIn, X)"),
        ],
      },
    ],
    defaults: { title: "Speakers", items: [] },
  },
  {
    type: "sponsors",
    label: "Sponsors",
    description: "Logos por tier, con links medibles.",
    fields: [
      text("title", "Título", "Sponsors"),
      text("note", "Nota", "¿Quieres patrocinar? Escríbenos."),
      url("contact_url", "Link de contacto para sponsors"),
      {
        name: "tiers",
        label: "Tiers",
        kind: "items",
        itemLabel: "Tier",
        help: "Cada tier agrupa logos: Platinum, Gold, Community…",
        fields: [
          text("name", "Nombre del tier", "Gold"),
          {
            name: "size",
            label: "Tamaño de logo",
            kind: "select",
            options: [
              { value: "lg", label: "Grande" },
              { value: "md", label: "Mediano" },
              { value: "sm", label: "Pequeño" },
            ],
          },
          {
            name: "logos",
            label: "Logos",
            kind: "items",
            itemLabel: "Sponsor",
            fields: [
              text("name", "Nombre"),
              url("logo_url", "Logo (URL)"),
              url("link", "Sitio web"),
            ],
          },
        ],
      },
    ],
    defaults: { title: "Sponsors", tiers: [] },
  },
  {
    type: "gallery",
    label: "Galería",
    description: "Fotos del evento o de ediciones pasadas.",
    fields: [
      text("title", "Título", "Galería"),
      {
        name: "columns",
        label: "Columnas",
        kind: "select",
        options: [
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
        ],
      },
      {
        name: "items",
        label: "Imágenes",
        kind: "items",
        itemLabel: "Imagen",
        fields: [url("src", "URL de la imagen"), text("caption", "Pie de foto")],
      },
    ],
    defaults: { title: "Galería", columns: "3", items: [] },
  },
  {
    type: "video",
    label: "Video",
    description: "Embed de YouTube, Vimeo o Mux.",
    fields: [
      text("title", "Título", "Video"),
      url("src", "URL del video", "https://www.youtube.com/watch?v=…"),
      { name: "caption", label: "Descripción", kind: "textarea" },
    ],
    defaults: { title: "Video", src: "" },
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Preguntas frecuentes plegables.",
    fields: [
      text("title", "Título", "Preguntas frecuentes"),
      {
        name: "items",
        label: "Preguntas",
        kind: "items",
        itemLabel: "Pregunta",
        fields: [
          text("q", "Pregunta"),
          { name: "a", label: "Respuesta", kind: "textarea" },
        ],
      },
    ],
    defaults: { title: "Preguntas frecuentes", items: [] },
  },
  {
    type: "map",
    label: "Mapa",
    description: "Mapa de la sede (usa la dirección del evento).",
    fields: [
      text("title", "Título", "Ubicación"),
      text("query", "Búsqueda custom", "Nombre del lugar, ciudad"),
    ],
    defaults: { title: "Ubicación" },
  },
  {
    type: "cta",
    label: "Llamada a la acción",
    description: "Banner con botón (registro, sponsors, CFP…).",
    fields: [
      text("title", "Título", "¿Te animas a dar una charla?"),
      { name: "body", label: "Texto", kind: "textarea" },
      text("cta_label", "Texto del botón", "Enviar propuesta"),
      url("cta_url", "Link del botón"),
      {
        name: "variant",
        label: "Estilo",
        kind: "select",
        options: [
          { value: "solid", label: "Sólido" },
          { value: "soft", label: "Suave" },
        ],
      },
    ],
    defaults: { variant: "soft", cta_label: "Quiero participar" },
  },
  {
    type: "countdown",
    label: "Cuenta regresiva",
    description: "Reloj hasta el inicio del evento.",
    fields: [
      text("title", "Título", "Faltan"),
      text("finished_label", "Texto al terminar", "¡Ya empezó!"),
    ],
    defaults: { title: "Faltan", finished_label: "¡Ya empezó!" },
  },
  {
    type: "testimonials",
    label: "Testimonios",
    description: "Citas de asistentes de ediciones pasadas.",
    fields: [
      text("title", "Título", "Lo que dicen los asistentes"),
      {
        name: "items",
        label: "Testimonios",
        kind: "items",
        itemLabel: "Testimonio",
        fields: [
          { name: "quote", label: "Cita", kind: "textarea" },
          text("author", "Autor"),
          text("role", "Cargo / empresa"),
          url("photo_url", "Foto (URL)"),
        ],
      },
    ],
    defaults: { title: "Lo que dicen los asistentes", items: [] },
  },
  {
    type: "custom",
    label: "Embed / HTML",
    description: "Embeds por URL (Spotify, Figma, Typeform…) o HTML simple.",
    fields: [
      text("title", "Título"),
      url("embed_url", "URL a embedir (iframe)"),
      {
        name: "html",
        label: "HTML",
        kind: "textarea",
        help: "Se sanitiza: solo texto con formato básico (p, a, strong, ul, li…).",
      },
    ],
    defaults: {},
  },
];

export function blockDef(type: string): BlockDef | undefined {
  return BLOCK_DEFS.find((b) => b.type === type);
}

export function blockLabel(type: string): string {
  return blockDef(type)?.label ?? type;
}
