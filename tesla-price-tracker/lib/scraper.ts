/**
 * Relevé des prix Tesla neufs.
 *
 * PIVOT 1 (30/08/2026) : l'approche précédente (API d'inventaire
 * /inventory/api/v4/inventory-results) est abandonnée au profit d'un scrap
 * direct de la page configurateur publique (ex.
 * tesla.com/fr_fr/model3/design#overview), qui affiche le prix catalogue de
 * la configuration de base — toujours disponible, que du stock existe ou
 * non.
 *
 * PIVOT 2 (20/09/2026) : plus aucun scraping local (ni ScraperAPI, ni
 * navigateur headless). tesla.com bloque directement les IP des runners
 * GitHub Actions au niveau Akamai ("Access Denied" immédiat, ~300
 * caractères, avant même le rendu JS — vérifié en conditions réelles) :
 * un navigateur local seul n'y change rien. La récupération est maintenant
 * entièrement déléguée à l'agent IA (lib/aiAgent.ts, Claude + outil serveur
 * web_fetch) : c'est Claude qui va chercher la page, depuis
 * l'infrastructure Anthropic, et en extrait directement le prix. Ce fichier
 * ne fait plus que construire l'URL cible et appeler l'agent.
 *
 * Limite connue : ne donne que le prix de la configuration de base
 * affichée par défaut (finition la moins chère), pas un prix par finition.
 *
 * Model S / Model X : confirmé le 30/08/2026 (vérifié manuellement sur
 * tesla.com/fr_fr) que ces modèles ne sont actuellement pas commandables
 * neufs sur ce marché — "Commander" redirige vers l'inventaire
 * d'occasion, pas de page configurateur avec prix catalogue. 0 résultat
 * est donc le comportement attendu, pas un bug. Idem pour Cybertruck, non
 * vendu en Europe.
 */

import { COUNTRIES, MODELS } from "./countries";
import { fetchPriceWithAIAgent } from "./aiAgent";

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

// Fourchette plausible pour un prix de véhicule Tesla neuf, par devise —
// sert uniquement de garde-fou sur ce que renvoie l'agent IA (pas
// d'extraction ici, juste une validation de bon sens avant d'écrire en
// base). Volontairement large pour couvrir toute la gamme (Model 3 au
// Model X).
const PLAUSIBLE_PRICE_RANGE: Record<string, [number, number]> = {
  EUR: [15000, 200000],
  GBP: [15000, 200000],
  DKK: [110000, 1500000],
  SEK: [160000, 2200000],
  PLN: [60000, 900000],
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

export async function fetchPricesForModel(
  countryCode: string,
  modelSlug: string
): Promise<PriceResult[]> {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const currency = country?.currency ?? "EUR";
  const targetUrl = buildTeslaConfiguratorUrl(countryCode, modelSlug);

  const price = await fetchPriceWithAIAgent(targetUrl, currency);
  if (price === null) {
    return [];
  }

  const [minPlausible, maxPlausible] = PLAUSIBLE_PRICE_RANGE[currency] ?? [15000, 200000];
  if (price < minPlausible || price > maxPlausible) {
    console.warn(
      `Prix rejeté pour ${modelSlug}/${countryCode}: ${price} ${currency} hors fourchette plausible ` +
        `[${minPlausible}, ${maxPlausible}]`
    );
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
