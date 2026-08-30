/**
 * Scraper des prix Tesla neufs.
 *
 * Endpoint et forme de requête VÉRIFIÉS le 29/08/2026 par capture DevTools
 * d'une vraie requête réussie faite par tesla.com/fr_fr/inventory/new/m3
 * (onglet Network, filtre Fetch/XHR, requête "inventory-results", status
 * 200) : /inventory/api/v4/inventory-results, réponse dans
 * results.exact[]/results.approximate[].
 *
 * Deux approches testées en production avant celle-ci, toutes les deux
 * bloquées par la protection anti-bot Akamai de Tesla (IP du datacenter
 * Vercel repérée comme non-humaine) :
 * 1. fetch() serveur direct, même avec les en-têtes exacts observés → 403
 *    systématique.
 * 2. Navigateur headless (Playwright) → bloqué avec une page "Access
 *    Denied" explicite avant même que le JS ne s'exécute.
 *
 * Solution retenue : router la requête via ScraperAPI (SCRAPERAPI_KEY),
 * qui dispose d'un grand pool d'IP résidentielles — la requête arrive chez
 * Tesla comme si elle venait d'un vrai visiteur, pas d'un centre de
 * données. Comme on cible directement l'API JSON de Tesla (pas une page
 * HTML à rendre), pas besoin du rendu JS de ScraperAPI (plus cher).
 *
 * En revanche, le paramètre `premium=true` EST nécessaire (contrairement à
 * ce qu'on pensait initialement) : tesla.com est un "domaine protégé" côté
 * ScraperAPI (Akamai) — sans ce paramètre, ScraperAPI utilise son pool de
 * proxies standard, insuffisant, et renvoie un 500 explicite le demandant.
 * Repéré en prod le 29/08/2026 après une journée d'échecs quasi
 * systématiques à tort attribués à la concurrence/au volume de requêtes.
 */

import { COUNTRIES, MODELS } from "./countries";

export interface PriceResult {
  country: string;
  model: string;
  trim: string;
  priceCents: number;
  currency: string;
}

interface InventoryItem {
  Price?: number;
  InventoryPrice?: number;
  TotalPrice?: number;
  TrimName?: string;
  Trim?: string;
  CurrencyCode?: string;
}

interface InventoryResponse {
  results?: {
    exact?: InventoryItem[];
    approximate?: InventoryItem[];
    approximateOutside?: InventoryItem[];
  };
  total_matches_found?: number;
}

function parsePriceResponse(
  raw: InventoryResponse,
  country: string,
  model: string
): PriceResult[] {
  const results: PriceResult[] = [];
  const defaultCurrency = COUNTRIES.find((c) => c.code === country)?.currency ?? "EUR";

  // "exact" = correspond pile aux critères de recherche ; on complète avec
  // "approximate" (résultats proches) si aucun résultat exact, pour éviter
  // des trous de données quand le marché est peu fourni sur un modèle.
  const items = [
    ...(raw.results?.exact ?? []),
    ...(raw.results?.exact?.length ? [] : raw.results?.approximate ?? []),
  ];

  for (const item of items) {
    const price = item.Price ?? item.InventoryPrice ?? item.TotalPrice;
    const trimName = item.TrimName ?? item.Trim ?? "Standard";

    if (typeof price === "number") {
      results.push({
        country,
        model,
        trim: String(trimName),
        priceCents: Math.round(price * 100),
        currency: item.CurrencyCode ?? defaultCurrency,
      });
    }
  }

  return results;
}

const INVENTORY_API_URL = "https://www.tesla.com/inventory/api/v4/inventory-results";

function buildTeslaApiUrl(countryCode: string, modelSlug: string): string {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const model = MODELS.find((m) => m.slug === modelSlug);

  if (!country || !model) {
    throw new Error(`Pays ou modèle inconnu: ${countryCode}/${modelSlug}`);
  }

  const query = {
    query: {
      model: model.teslaModel,
      condition: "new",
      options: {},
      arrangeby: "Price",
      order: "asc",
      market: country.teslaMarket,
      language: country.teslaLanguage,
      // Valeur fixe observée dans la vraie requête, quel que soit le pays.
      super_region: "north america",
      PaymentType: "cash",
      paymentRange: "0,999999",
      lng: country.anchor.lng,
      lat: country.anchor.lat,
      zip: country.anchor.zip,
      // Rayon de recherche large (au lieu du 0 observé dans la capture, qui
      // limite au strict voisinage du code postal) pour capter les
      // véhicules disponibles dans tout le pays.
      range: 200,
      region: country.teslaMarket,
    },
    offset: 0,
    count: 50,
    outsideOffset: 0,
    outsideSearch: false,
    isFalconDeliverySelectionEnabled: true,
    version: "v2",
  };

  return `${INVENTORY_API_URL}?query=${encodeURIComponent(JSON.stringify(query))}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPricesForModel(
  countryCode: string,
  modelSlug: string
): Promise<PriceResult[]> {
  const apiKey = process.env.SCRAPERAPI_KEY;
  if (!apiKey) {
    throw new Error("SCRAPERAPI_KEY manquant dans les variables d'environnement");
  }

  const targetUrl = buildTeslaApiUrl(countryCode, modelSlug);
  // premium=true : requis par ScraperAPI pour les "domaines protégés" —
  // message d'erreur explicite obtenu en prod le 29/08/2026 ("Protected
  // domains may require adding premium=true OR ultra_premium=true
  // parameter to your request") sur tesla.com (protégé par Akamai). Sans ce
  // paramètre, ScraperAPI utilise son pool de proxies standard, insuffisant
  // ici — d'où les échecs quasi systématiques observés toute la journée
  // (pas un problème de concurrence, de timeout ou de volume de requêtes).
  const proxyUrl = `https://api.scraperapi.com/?api_key=${apiKey}&premium=true&url=${encodeURIComponent(targetUrl)}`;

  let response: Response | undefined;
  let lastError: unknown;

  // Un aller-retour relayé par ScraperAPI (IP résidentielle) prend souvent
  // plus de 25s, voire plus quand ScraperAPI doit contourner activement la
  // protection Akamai de Tesla — remonté de 45s à 75s le 29/08/2026 pour
  // laisser cette marge plutôt que de couper une requête qui aurait fini par
  // aboutir. On réessaie sur un timeout/erreur réseau, sur un 429 ("trop de
  // requêtes simultanées") et sur tout 5xx (erreur transitoire côté
  // ScraperAPI ou de la cible relayée) : dans ces cas, patienter et retenter
  // suffit généralement. Un 500 n'était jusqu'ici jamais réessayé (bug — la
  // condition ne couvrait que le 429), repéré en prod le 29/08/2026 via le
  // workflow GitHub Actions (voir .github/workflows/check-prices.yml).
  //
  // 3 tentatives : le relevé quotidien passe désormais par ce workflow
  // GitHub Actions, sans limite de temps stricte (contrairement aux
  // fonctions serverless Vercel) — plus besoin de sacrifier des tentatives
  // pour tenir dans un budget de 290s.
  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      response = await fetch(proxyUrl, { signal: AbortSignal.timeout(75000) });
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
      `Échec de récupération des prix pour ${modelSlug}/${countryCode}: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`
    );
  }

  if (!response.ok) {
    // Le corps de la réponse (tronqué) donne souvent la vraie raison côté
    // ScraperAPI (clé invalide, quota épuisé, cible injoignable...) — un
    // simple code de statut ne suffisait pas à diagnostiquer un 500
    // systématique (voir workflow GitHub Actions du 29/08/2026).
    const body = await response.text().catch(() => "");
    throw new Error(
      `Échec de récupération des prix pour ${modelSlug}/${countryCode}: ${response.status} ${body.slice(0, 300)}`
    );
  }

  const raw: InventoryResponse = await response.json();
  return parsePriceResponse(raw, countryCode, modelSlug);
}
