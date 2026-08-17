import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Punto de retorno del magic link. Intercambia el `code` (flujo PKCE) por una
// sesión y redirige al destino seguro indicado en `next` (o a /dashboard).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const nextRaw = url.searchParams.get("next") ?? "/dashboard";

  // Validar `next` para evitar open redirect: solo paths internos relativos.
  const safeNext =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  if (errorParam) {
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", "auth");
    if (errorDescription)
      loginUrl.searchParams.set("message", errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("error", "auth");
      loginUrl.searchParams.set("message", error.message);
      return NextResponse.redirect(loginUrl);
    }
  }

  const res = NextResponse.redirect(new URL(safeNext, url.origin));
  return res;
}
