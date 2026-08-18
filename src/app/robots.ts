import type { MetadataRoute } from "next";

/**
 * robots.txt. Permitimos todo excepto rutas internas (dashboard, api, auth).
 * Las páginas públicas (/c, /e, /explore) son indexables.
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/api", "/auth", "/admin", "/login"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
