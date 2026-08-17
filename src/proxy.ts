import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import {
  calendarSlugForHost,
  shouldRewriteToCalendar,
} from "@/lib/custom-domain";

// Next.js 16: el middleware se llama "proxy".
export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  // Dominio propio de comunidad: `eventos.midominio.com/` → `/c/<slug>`.
  const { pathname } = request.nextUrl;
  if (shouldRewriteToCalendar(pathname)) {
    const slug = await calendarSlugForHost(request.headers.get("host"));
    if (slug) {
      const url = request.nextUrl.clone();
      url.pathname = pathname === "/" ? `/c/${slug}` : `/c/${slug}${pathname}`;
      const rewrite = NextResponse.rewrite(url, { request });
      for (const cookie of response.cookies.getAll()) {
        rewrite.cookies.set(cookie);
      }
      return rewrite;
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Omitir rutas estáticas y archivos públicos.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
