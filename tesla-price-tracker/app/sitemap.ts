import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

// Pages publiques indexables. /compte est volontairement exclu : c'est un
// espace connecté sans contenu utile pour un moteur de recherche.
const PATHS = [""];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.flatMap((path) =>
    locales.map((locale) => ({
      url: `${APP_URL}/${locale}${path}`,
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${APP_URL}/${l}${path}`])),
      },
    }))
  );
}
