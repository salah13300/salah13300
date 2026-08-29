/**
 * Scraper des prix Tesla neufs.
 *
 * Endpoint et forme de requête VÉRIFIÉS le 29/08/2026 par capture DevTools
 * d'une vraie requête réussie faite par tesla.com/fr_fr/inventory/new/m3
 * (onglet Network, filtre Fetch/XHR, requête "inventory-results", status
 * 200) : /inventory/api/v4/inventory-results, réponse dans
 * results.exact[]/results.approximate[].
 *
 * Un fetch() serveur direct vers cet endpoint (voir `fetchPricesForModel`
 * ci-dessous), même avec les en-têtes exacts observés dans la vraie
 * requête (Referer compris), s'est fait bloquer par un 403 systématique une
 * fois déployé sur Vercel. Ce n'est donc pas un problème d'en-têtes
 * manquants mais du blocage anti-bot Akamai de Tesla au niveau de la
 * connexion elle-même (empreinte TLS, réputation de l'IP du datacenter).
 *
 * `fetchPricesForModelViaBrowser` contourne ça en faisant faire la requête
 * par un vrai Chromium headless (Playwright + @sparticuz/chromium, conçu
 * pour tourner dans une fonction serverless Vercel) qui charge la vraie
 * page du configurateur et intercepte sa réponse réseau — c'est la
 * fonction utilisée par lib/priceCheck.ts. Non garanti à 100% : Tesla peut
 * quand même bloquer si l'IP du datacenter Vercel est elle-même repérée,
 * indépendamment du fait que ce soit un vrai navigateur.
 */

import type { Browser, Page } from "playwright-core";
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

function inventoryPageUrl(countryCode: string, modelSlug: string): string {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const model = MODELS.find((m) => m.slug === modelSlug);

  if (!country || !model) {
    throw new Error(`Pays ou modèle inconnu: ${countryCode}/${modelSlug}`);
  }

  const locale = `${country.teslaLanguage}_${country.teslaMarket}`;
  const params = new URLSearchParams({
    arrangeby: "plh",
    zip: country.anchor.zip,
    range: "200",
    PaymentType: "cash",
  });

  return `https://www.tesla.com/${locale}/inventory/new/${model.teslaModel}?${params}`;
}

// --- Approche navigateur headless (utilisée en production) ---------------

export async function launchScraperBrowser(): Promise<Browser> {
  const [{ chromium: playwrightChromium }, sparticuzChromium] = await Promise.all([
    import("playwright-core"),
    import("@sparticuz/chromium").then((m) => m.default),
  ]);

  return playwrightChromium.launch({
    args: sparticuzChromium.args,
    executablePath: await sparticuzChromium.executablePath(),
    headless: true,
  });
}

// Charge la vraie page du configurateur Tesla dans le navigateur fourni et
// intercepte la réponse réseau de l'appel "inventory-results" qu'elle
// déclenche elle-même — reproduit ainsi une requête de navigateur
// authentique plutôt que d'appeler l'API directement.
export async function fetchPricesForModelViaBrowser(
  browser: Browser,
  countryCode: string,
  modelSlug: string
): Promise<PriceResult[]> {
  const page: Page = await browser.newPage();

  try {
    // On ne rend jamais la page visuellement : bloquer images/polices/CSS/
    // médias réduit nettement le temps de chargement et la mémoire utilisée
    // (important vu qu'on fait tourner plusieurs onglets en parallèle dans
    // une fonction serverless à mémoire limitée). Le JS reste autorisé :
    // c'est lui qui déclenche l'appel réseau qu'on veut intercepter.
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "font", "stylesheet", "media"].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    // On n'attend PAS le chargement complet de la page (elle continue de
    // charger pubs/analytics longtemps après) : juste la réponse réseau
    // précise qui nous intéresse, beaucoup plus rapide vu qu'on répète ça
    // 65 fois dans le temps limité d'une fonction serverless.
    const responsePromise = page.waitForResponse(
      (response) => response.url().includes("inventory-results") && response.ok(),
      { timeout: 20000 }
    );

    await page.goto(inventoryPageUrl(countryCode, modelSlug), {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    let response;
    try {
      response = await responsePromise;
    } catch (err) {
      // Diagnostic : si la réponse attendue n'arrive jamais, on capture ce
      // que le navigateur a vraiment reçu (titre/URL — probablement un défi
      // anti-bot ou une redirection plutôt que la vraie page) pour
      // comprendre pourquoi, sans avoir besoin d'un nouveau cycle de debug.
      const title = await page.title().catch(() => "?");
      const finalUrl = page.url();
      throw new Error(
        `Pas de réponse inventory-results reçue (page: "${title}" @ ${finalUrl}) — ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }

    const captured = (await response.json()) as InventoryResponse;

    return parsePriceResponse(captured, countryCode, modelSlug);
  } finally {
    await page.close();
  }
}

// --- Approche fetch() direct (conservée pour référence / tests locaux) ---
// Fonctionne en local (accès réseau normal) mais se fait bloquer (403) une
// fois déployée sur Vercel — voir le commentaire en tête de fichier.

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
      super_region: "north america",
      PaymentType: "cash",
      paymentRange: "0,999999",
      lng: country.anchor.lng,
      lat: country.anchor.lat,
      zip: country.anchor.zip,
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

export async function fetchPricesForModel(
  countryCode: string,
  modelSlug: string
): Promise<PriceResult[]> {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const model = MODELS.find((m) => m.slug === modelSlug);

  if (!country || !model) {
    throw new Error(`Pays ou modèle inconnu: ${countryCode}/${modelSlug}`);
  }

  const response = await fetch(buildPriceRequestUrl(countryCode, modelSlug), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept: "application/json, text/plain, */*",
      Referer: inventoryPageUrl(countryCode, modelSlug),
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
