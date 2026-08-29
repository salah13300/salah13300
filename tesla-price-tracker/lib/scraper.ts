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
 * HTML à rendre), pas besoin du rendu JS de ScraperAPI (plus cher) : un
 * simple passthrough suffit.
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
  const proxyUrl = `https://api.scraperapi.com/?api_key=${apiKey}&url=${encodeURIComponent(targetUrl)}`;

  let response: Response | undefined;
  let lastError: unknown;

  // Un aller-retour relayé par ScraperAPI (IP résidentielle) prend souvent
  // plus de 25s — un premier essai à ce délai a échoué systématiquement en
  // prod (timeout côté client, pas une vraie erreur de ScraperAPI). On
  // réessaie aussi bien sur un timeout/erreur réseau que sur un 429 ("trop
  // de requêtes simultanées") : dans les deux cas, patienter et retenter
  // suffit généralement.
  //
  // Limité à 2 tentatives (pas 3) : avec 5 modèles à vérifier par pays dans
  // une seule invocation (voir priceCheck.ts), le budget de temps total doit
  // rester sous maxDuration (290s) même si plusieurs modèles échouent à
  // chaque essai. Vérifié en prod le 29/08/2026 : à 3 tentatives, certains
  // modèles échouaient encore par timeout alors que ScraperAPI répondait
  // correctement (pas de 403/bloqué), simplement parce que le budget total
  // (jusqu'à 3 × 45s + délais, par modèle) dépassait la limite une fois
  // cumulé sur plusieurs modèles.
  const MAX_ATTEMPTS = 2;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      response = await fetch(proxyUrl, { signal: AbortSignal.timeout(45000) });
      if (response.status !== 429) break;
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
    throw new Error(
      `Échec de récupération des prix pour ${modelSlug}/${countryCode}: ${response.status}`
    );
  }

  const raw: InventoryResponse = await response.json();
  return parsePriceResponse(raw, countryCode, modelSlug);
}
