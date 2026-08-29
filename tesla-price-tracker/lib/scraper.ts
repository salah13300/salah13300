/**
 * Scraper des prix Tesla neufs.
 *
 * Endpoint et forme de requête VÉRIFIÉS le 29/08/2026 par capture DevTools
 * d'une vraie requête réussie faite par tesla.com/fr_fr/inventory/new/m3
 * (onglet Network, filtre Fetch/XHR, requête "inventory-results", status
 * 200). Contrairement à une version précédente de ce fichier, basée sur des
 * projets open source non vérifiés directement, celle-ci reproduit une
 * requête réelle capturée dans le navigateur.
 *
 * Deux points à surveiller si Tesla change son site :
 * - Le "super_region" observé était "north america" même pour une recherche
 *   en France — ça semble être une valeur fixe côté frontend Tesla plutôt
 *   qu'une vraie régionalisation, reproduite ici telle quelle.
 * - Le code postal ("zip") par pays (lib/countries.ts) fixe le point de
 *   recherche ; combiné à un "range" (rayon, probablement en km) large pour
 *   couvrir tout le pays plutôt qu'un seul point précis. Les codes postaux
 *   n'ont été vérifiés qu'un par un pour la France dans la capture d'origine
 *   — à ajuster si un marché renvoie 0 résultat de façon persistante.
 *
 * Important : Tesla protège ses endpoints avec Akamai Bot Manager. Un fetch
 * serveur "nu" (sans les en-têtes ci-dessous, notamment Referer) s'est fait
 * bloquer avec un 403 systématique lors du premier test en production. Les
 * en-têtes ajoutés ici reproduisent ceux observés dans la requête réelle du
 * navigateur ; si les blocages reprennent (usage élevé, changement de
 * politique anti-bot Tesla), il faudra probablement espacer les appels ou
 * passer par un navigateur headless (Playwright) pour ce cron.
 */

import { COUNTRIES, MODELS } from "./countries";

export interface PriceResult {
  country: string;
  model: string;
  trim: string;
  priceCents: number;
  currency: string;
}

const INVENTORY_API_URL = "https://www.tesla.com/inventory/api/v4/inventory-results";

function buildPriceRequestUrl(countryCode: string, modelSlug: string): string {
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
      // Valeur fixe observée dans la vraie requête, quel que soit le pays —
      // voir le commentaire en tête de fichier.
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

export async function fetchPricesForModel(
  countryCode: string,
  modelSlug: string
): Promise<PriceResult[]> {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const model = MODELS.find((m) => m.slug === modelSlug);

  if (!country || !model) {
    throw new Error(`Pays ou modèle inconnu: ${countryCode}/${modelSlug}`);
  }

  const url = buildPriceRequestUrl(countryCode, modelSlug);
  const refererLocale = `${country.teslaLanguage}_${country.teslaMarket}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      // Observé comme présent sur la requête réelle — probablement vérifié
      // par la protection anti-bot de Tesla.
      Referer: `https://www.tesla.com/${refererLocale}/inventory/new/${model.teslaModel}?arrangeby=plh&zip=${country.anchor.zip}&PaymentType=cash`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Échec de récupération des prix pour ${modelSlug}/${countryCode}: ${response.status}`
    );
  }

  const raw: InventoryResponse = await response.json();
  return parsePriceResponse(raw, countryCode, modelSlug);
}
