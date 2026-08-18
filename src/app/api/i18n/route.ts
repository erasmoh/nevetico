import { NextResponse } from "next/server";
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries";

/**
 * Setea la cookie `locale`. POST con { locale: "es" | "en" | "pt" }.
 * La cookie dura 1 año, same-site lax para que funcione en redirects.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const locale = body.locale as string | undefined;
  if (!locale || !(LOCALES as string[]).includes(locale)) {
    return NextResponse.json({ error: "Locale inválido." }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set("locale", locale as Locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
