import type { MetadataRoute } from "next";

/**
 * Web App Manifest para PWA. Permite "Agregar a pantalla de inicio" —
 * especialmente útil para la página de check-in en el día del evento
 * (funciona offline una vez instalada). El SW (public/sw.js) cachea
 * las rutas del dashboard de check-in.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nevetico — Check-in",
    short_name: "Nevetico",
    description:
      "Check-in de asistentes con QR para eventos de comunidades.",
    start_url: "/dashboard?source=pwa",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#6366f1",
    orientation: "portrait",
    categories: ["productivity", "business", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Explorar eventos",
        url: "/explore",
        description: "Descubre eventos cerca de ti",
      },
    ],
  };
}
