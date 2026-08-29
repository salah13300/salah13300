import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/config";

export default createMiddleware({
  locales,
  defaultLocale,
  localeDetection: true, // détecte la langue du navigateur au premier passage
});

export const config = {
  // S'applique à toutes les routes sauf les fichiers statiques et l'API
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
