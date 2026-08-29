const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Content-Security-Policy : autorise uniquement ce dont le site a besoin
// (polices Google Fonts, appels fetch same-origin, Stripe Checkout se fait
// par redirection complète donc n'a pas besoin d'être autorisé ici).
const csp = [
  "default-src 'self'",
  // Next.js a besoin de 'unsafe-inline' pour le script de bootstrap RSC
  // en dev/prod ; pas de 'unsafe-eval' pour rester strict.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  experimental: {
    // Sans ça, Vercel ne détecte pas que /api/prices/check a besoin du
    // binaire Chromium de @sparticuz/chromium (utilisé pour scraper Tesla
    // via un vrai navigateur, voir lib/scraper.ts) et ne l'inclut pas dans
    // le paquet de la fonction serverless déployée — erreur au runtime sinon.
    outputFileTracingIncludes: {
      "/api/prices/check": ["./node_modules/@sparticuz/chromium/**"],
    },
    // playwright-core référence des dépendances optionnelles non installées
    // (chromium-bidi, kerberos, ...) que webpack essaie de résoudre au
    // build et fait échouer. En "external", Next.js les charge directement
    // via require() au runtime au lieu de les empaqueter — comportement
    // normal de Node.js qui ignore les dépendances optionnelles absentes.
    serverComponentsExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  },
};

module.exports = withNextIntl(nextConfig);
