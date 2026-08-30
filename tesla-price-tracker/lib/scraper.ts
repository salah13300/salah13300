/**
 * Scraper des prix Tesla neufs.
 *
 * PIVOT (30/08/2026) : l'approche précédente (API d'inventaire
 * /inventory/api/v4/inventory-results) est abandonnée. Elle listait les
 * véhicules réellement en stock, mais :
 * 1. Elle nécessite un vrai rendu navigateur pour passer le challenge
 *    anti-bot Akamai (`render=true` côté ScraperAPI) — découvert en ouvrant
 *    l'URL cible directement dans un navigateur normal, qui renvoyait
 *    {"cpr_chlge":"true",...} au lieu des résultats.
 * 2. Même une fois ce point réglé, elle renvoie légitimement 0 résultat
 *    dès qu'aucun véhicule neuf n'est en stock sur le marché visé (ce qui
 *    est le cas normal pour la France en ce moment) — pas un bug, mais pas
 *    exploitable pour un suivi de prix quotidien fiable.
 *
 * Nouvelle approche : scraper directement la page configurateur publique
 * (ex. tesla.com/fr_fr/model3/design#overview), qui affiche le prix
 * catalogue de la configuration de base — toujours disponible, que du
 * stock existe ou non. Le prix n'est pas présent dans le HTML initial
 * (récupéré par Tesla via un appel séparé vers sa "pricing gateway" après
 * chargement) : `render=true` est nécessaire pour laisser ce rendu se
 * terminer avant de lire le HTML final.
 *
 * Ancre repérée le 30/08/2026 dans le HTML rendu, stable sur plusieurs
 * vérifications :
 *   data-id="footer-price-disclaimer">36 601&nbsp;€ Prix d'achat</p>
 *
 * Limite connue : ne donne que le prix de la configuration de base
 * affichée par défaut (finition la moins chère), pas un prix par finition
 * comme le faisait l'ancienne API d'inventaire.
 */

import { COUNTRIES, MODELS } from "./countries";

export interface PriceResult {
  country: string;
  model: string;
  trim: string;
  priceCents: number;
  currency: string;
}

// Chemin URL du configurateur Tesla par modèle — différent du code modèle
// ("teslaModel") utilisé par l'ancienne API d'inventaire.
const MODEL_CONFIGURATOR_PATH: Record<string, string> = {
  "model-3": "model3",
  "model-y": "modely",
  "model-s": "models",
  "model-x": "modelx",
  cybertruck: "cybertruck",
};

export function buildTeslaConfiguratorUrl(countryCode: string, modelSlug: string): string {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const model = MODELS.find((m) => m.slug === modelSlug);
  const configuratorPath = MODEL_CONFIGURATOR_PATH[modelSlug];

  if (!country || !model || !configuratorPath) {
    throw new Error(`Pays ou modèle inconnu: ${countryCode}/${modelSlug}`);
  }

  // Tesla utilise le code locale en minuscules dans ses URLs (ex. fr_fr),
  // alors que COUNTRIES.locale est au format "fr_FR".
  const localePath = country.locale.toLowerCase();
  return `https://www.tesla.com/${localePath}/${configuratorPath}/design#overview`;
}

function parseConfiguratorPrice(
  html: string,
  countryCode: string,
  modelSlug: string
): PriceResult[] {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const currency = country?.currency ?? "EUR";

  // Capture les chiffres/séparateurs (espace normal, insécable via &nbsp;,
  // virgule, point) juste après l'ancre, jusqu'au premier caractère qui n'en
  // fait pas partie (symbole monétaire, lettre...).
  const anchorMatch = html.match(/data-id="footer-price-disclaimer">([^<]*)/i);
  if (!anchorMatch) {
    return [];
  }

  const numberMatch = anchorMatch[1].match(/[\d](?:[\d\s.,]|&nbsp;)*/i);
  if (!numberMatch) {
    return [];
  }

  const cleaned = numberMatch[0]
    .replace(/&nbsp;/gi, "")
    .replace(/\s/g, "")
    .replace(",", ".");
  const price = parseFloat(cleaned);

  if (!Number.isFinite(price)) {
    return [];
  }

  return [
    {
      country: countryCode,
      model: modelSlug,
      trim: "Standard",
      priceCents: Math.round(price * 100),
      currency,
    },
  ];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRenderedHtml(targetUrl: string): Promise<string> {
  const apiKey = process.env.SCRAPERAPI_KEY;
  if (!apiKey) {
    throw new Error("SCRAPERAPI_KEY manquant dans les variables d'environnement");
  }

  // ultra_premium=true : tesla.com est un domaine protégé côté ScraperAPI
  // (Akamai) — le pool standard et même premium=true se sont révélés
  // insuffisants en pratique (vérifié en prod le 29-30/08/2026).
  // render=true : nécessaire pour laisser le temps à l'appel JS de pricing
  // de se terminer avant de lire le HTML (voir docstring en haut du
  // fichier) — coûte plus cher en crédits ScraperAPI mais indispensable ici.
  const proxyUrl = `https://api.scraperapi.com/?api_key=${apiKey}&ultra_premium=true&render=true&url=${encodeURIComponent(targetUrl)}`;

  let response: Response | undefined;
  let lastError: unknown;

  // 3 tentatives, 75s par tentative : le relevé quotidien passe par le
  // workflow GitHub Actions (.github/workflows/check-prices.yml), sans
  // limite de temps stricte contrairement aux fonctions serverless Vercel.
  // On réessaie sur timeout/erreur réseau, 429 (trop de requêtes
  // simultanées) et tout 5xx (erreur transitoire côté ScraperAPI ou de la
  // cible relayée).
  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      response = await fetch(proxyUrl, { signal: AbortSignal.timeout(85000) });
      if (response.status !== 429 && response.status < 500) break;
    } catch (err) {
      lastError = err;
      response = undefined;
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(3000 * (attempt + 1));
    }
  }

  if (!response) {
    throw new Error(
      `Échec de récupération de la page: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Échec de récupération de la page: ${response.status} ${body.slice(0, 300)}`);
  }

  return response.text();
}

export async function fetchPricesForModel(
  countryCode: string,
  modelSlug: string
): Promise<PriceResult[]> {
  const targetUrl = buildTeslaConfiguratorUrl(countryCode, modelSlug);
  const html = await fetchRenderedHtml(targetUrl);
  return parseConfiguratorPrice(html, countryCode, modelSlug);
}
