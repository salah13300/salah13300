import { NextResponse } from "next/server";
import {
  verifyMagicLinkToken,
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
} from "@/lib/auth";
import { locales, defaultLocale, type Locale } from "@/i18n/config";

// GET /api/auth/callback?token=...&locale=fr
// Point d'entrée du lien envoyé par email : vérifie le jeton, ouvre une
// session (cookie httpOnly signé) et redirige vers /compte.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");
  const localeParam = searchParams.get("locale");
  const locale: Locale = locales.includes(localeParam as Locale)
    ? (localeParam as Locale)
    : defaultLocale;

  const appUrl = process.env.APP_URL ?? origin;
  const verified = token ? verifyMagicLinkToken(token) : null;

  if (!verified) {
    return NextResponse.redirect(`${appUrl}/${locale}/compte?authError=1`);
  }

  const sessionToken = createSessionToken(verified.email);
  const response = NextResponse.redirect(`${appUrl}/${locale}/compte`);

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });

  return response;
}
