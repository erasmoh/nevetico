import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión de Supabase en cada request escribiendo las cookies
 * actualizadas en la respuesta. Se invoca desde `src/proxy.ts` (Next 16:
 * el antiguo "middleware" ahora se llama "proxy").
 *
 * Usa `getUser()` (no `getSession()`) para validar contra el servidor de Auth
 * y evitar el warning de recursión de cookies.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // No usar getUser() entre llamadas get/set de cookies sin usar el resultado:
  // aquí lo usamos para forzar el refresh de la sesión.
  await supabase.auth.getUser();

  return supabaseResponse;
}
