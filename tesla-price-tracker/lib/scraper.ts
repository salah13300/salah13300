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

  // 429 = trop de requêtes simultanées pour le plan ScraperAPI en cours.
  // Sur un pic temporaire (plusieurs relevés qui démarrent au même moment),
  // patienter puis réessayer suffit généralement — pas la peine d'échouer
  // tout de suite.
  for (let attempt = 0; attempt < 3; attempt++) {
    // Sans limite explicite, une requête qui traîne peut bloquer tout un
    // "créneau" de la concurrence dans checkAllPrices bien au-delà de son
    // temps normal. 25s est déjà généreux pour un simple appel API relayé.
    response = await fetch(proxyUrl, { signal: AbortSignal.timeout(25000) });

    if (response.status !== 429) break;
    await sleep(2000 * (attempt + 1));
  }

  if (!response || !response.ok) {
    throw new Error(
      `Échec de récupération des prix pour ${modelSlug}/${countryCode}: ${response?.status}`
    );
  }

  const raw: InventoryResponse = await response.json();
  return parsePriceResponse(raw, countryCode, modelSlug);
}
