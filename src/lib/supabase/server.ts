import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

/**
 * Cliente Supabase para Server Components, Server Actions y Route Handlers.
 * Respeta RLS (usa la cookie del usuario autenticado).
 * En Next.js 16 `cookies()` es async.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // La cookie solo se puede escribir desde una Server Action o Route Handler.
            // En Server Components de solo lectura esto se ignora; el proxy refresca la sesión.
          }
        },
      },
    },
  );
}
