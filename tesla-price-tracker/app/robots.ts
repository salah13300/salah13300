import type { MetadataRoute } from "next";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /compte est un espace connecté (session), /api est technique —
        // aucun des deux n'a de valeur à être indexé.
        disallow: ["/api/", "/*/compte"],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
