/**
 * Scraper des prix Tesla neufs.
 *
 * Tesla n'a pas d'API publique documentée pour les prix, mais son site
 * s'appuie côté client sur l'API "inventaire" qui liste les véhicules neufs
 * disponibles à la commande (utilisée par la page /inventory/new/... et
 * indirectement par les pages de configurateur). Cette API est utilisée —
 * en la reconstituant depuis les requêtes réseau observées dans le
 * navigateur — par plusieurs projets open source de suivi de prix Tesla
 * (ex. teslahunt/inventory, kaedenbrinkman/tesla-inventory). Le point
 * d'entrée et la forme de la requête ci-dessous viennent de ces sources ;
 * les valeurs marquées "à vérifier" n'ont PAS pu être testées contre
 * l'API réelle depuis cet environnement (accès réseau vers tesla.com
 * bloqué ici) et sont à confirmer avec un vrai relevé DevTools avant mise
 * en prod (voir README > "Vérifier le scraper avant la prod").
 *
 * Pour vérifier/ajuster :
 * 1. Ouvre https://www.tesla.com/fr_fr/inventory/new/m3 (ou le marché voulu)
 * 2. DevTools > Network > filtre "inventory-results"
 * 3. Compare l'URL et le corps de réponse à buildPriceRequestUrl /
 *    parsePriceResponse ci-dessous, ajuste si Tesla a changé le format.
 *
 * Important : Tesla protège ses endpoints avec Akamai Bot Manager. Un simple
 * fetch() serveur (ex. depuis un cron Vercel) peut se faire bloquer/challenger
 * plus vite qu'un navigateur réel, surtout à volume élevé. Si les requêtes se
 * mettent à échouer systématiquement, il faudra probablement espacer les
 * appels, tourner un User-Agent réaliste, voire passer par un navigateur
 * headless (Playwright) pour ce cron au lieu d'un simple fetch.
 */

import { COUNTRIES, MODELS } from "./countries";

export interface PriceResult {
  country: string;
  model: string;
  trim: string;
  priceCents: number;
  currency: string;
}

const INVENTORY_API_URL = "https://www.tesla.com/inventory/api/v1/inventory-results";

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
      // "à vérifier" : Tesla regroupe ses marchés par grande région
      // ("north america" confirmé pour les US/CA dans plusieurs sources) ;
      // "europe" est l'hypothèse la plus probable pour les marchés
      // ci-dessus mais n'a pas pu être confirmée depuis cet environnement.
      super_region: "europe",
      lat: country.anchor.lat,
      lng: country.anchor.lng,
      // "à vérifier" : un rayon de recherche large pour capter les
      // véhicules disponibles dans tout le pays, pas seulement près de
      // la capitale. Réduire/augmenter selon les résultats observés.
      range: 200,
      zip: "",
    },
    offset: 0,
    count: 50,
    outsideOffset: 0,
    outsideSearch: false,
  };

  return `${INVENTORY_API_URL}?query=${encodeURIComponent(JSON.stringify(query))}`;
}

async function parsePriceResponse(
  raw: unknown,
  country: string,
  model: string
): Promise<PriceResult[]> {
  const results: PriceResult[] = [];

  // "à vérifier" : la clé de premier niveau contenant la liste de véhicules
  // (`results` d'après les projets consultés) n'a pas pu être confirmée
  // directement — vérifier avec une vraie réponse et ajuster si besoin.
  const items = (raw as any)?.results ?? [];

  for (const item of items) {
    const price = item?.Price ?? item?.InventoryPrice ?? item?.TotalPrice;
    const trimName = item?.TrimName ?? item?.Trim ?? "Standard";
    const currency = item?.CurrencyCode ?? undefined;

    if (typeof price === "number") {
      results.push({
        country,
        model,
        trim: String(trimName),
        priceCents: Math.round(price * 100),
        currency: currency ?? COUNTRIES.find((c) => c.code === country)?.currency ?? "EUR",
      });
    }
  }

  return results;
}

export async function fetchPricesForModel(
  countryCode: string,
  modelSlug: string
): Promise<PriceResult[]> {
  const url = buildPriceRequestUrl(countryCode, modelSlug);

  const response = await fetch(url, {
    headers: {
      // Un User-Agent de vrai navigateur réduit le risque d'être bloqué
      // par la protection anti-bot de Tesla (voir note en tête de fichier).
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Échec de récupération des prix pour ${modelSlug}/${countryCode}: ${response.status}`
    );
  }

  const raw = await response.json();
  return parsePriceResponse(raw, countryCode, modelSlug);
}
