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
 *
 * Model S / Model X : confirmé le 30/08/2026 (vérifié manuellement sur
 * tesla.com/fr_fr) que ces modèles ne sont actuellement pas commandables
 * neufs sur ce marché — "Commander" redirige vers l'inventaire
 * d'occasion, pas de page configurateur avec prix catalogue. 0 résultat
 * est donc le comportement attendu, pas un bug du scraper. Idem pour
 * Cybertruck, non vendu en Europe.
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

// Symbole monétaire affiché sur la page, par devise (COUNTRIES.currency) —
// utilisé pour repérer les montants dans le HTML sans dépendre d'une
// mention légale spécifique à un marché (voir parseConfiguratorPrice).
const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  DKK: "kr",
  SEK: "kr",
  PLN: "zł",
};

// Fourchette plausible pour un prix de véhicule Tesla neuf, par devise —
// nécessaire car un simple seuil en euros (15 000-200 000) ne convient pas
// aux devises à valeur unitaire très différente (ex. couronnes, zloty).
// Volontairement large pour couvrir toute la gamme (Model 3 au Model X).
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

// Convertit un nombre affiché dans un format localisé (ex. "36 601",
// "36.601,00" en allemand/italien, ou "36,601.00" en anglais) en nombre
// JS. Bug repéré le 30/08/2026 : un simple remplacement de la première
// virgule par un point cassait les marchés utilisant le point comme
// séparateur de milliers (ex. "36.601,00" devenait "36.601.00", que
// parseFloat tronque à 36.601 au lieu de 36601). Règle : le dernier
// séparateur (point ou virgule) suivi d'exactement 2 chiffres jusqu'à la
// fin est le séparateur décimal ; tous les autres sont des séparateurs de
// milliers à retirer.
function parseLocalizedPrice(raw: string): number {
  const stripped = raw.replace(/&nbsp;/gi, "").replace(/\s/g, "");
  const lastSeparatorMatch = stripped.match(/[.,](\d{2})$/);

  if (lastSeparatorMatch) {
    const decimalPart = lastSeparatorMatch[1];
    const integerPart = stripped
      .slice(0, stripped.length - decimalPart.length - 1)
      .replace(/[.,]/g, "");
    return parseFloat(`${integerPart}.${decimalPart}`);
  }

  return parseFloat(stripped.replace(/[.,]/g, ""));
}

function parseConfiguratorPrice(
  html: string,
  countryCode: string,
  modelSlug: string
): PriceResult[] {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const currency = country?.currency ?? "EUR";

  // Repéré le 30/08/2026 : une ancre HTML précise ("footer-price-disclaimer",
  // trouvée sur la page FR) n'est pas universelle — absente sur BE alors que
  // la page était bien rendue en entier avec un vrai prix affiché. Stratégie
  // plus robuste, indépendante de la langue/mise en page : chercher TOUS les
  // montants accolés au symbole monétaire du pays, et prendre le plus PETIT
  // dans une fourchette plausible pour un prix de véhicule (PLAUSIBLE_PRICE_
  // RANGE, adaptée à la devise) — les mensualités, frais de dossier et
  // bonus/malus affichés à côté sont toujours nettement en dehors de cette
  // fourchette. Exiger le
  // symbole monétaire (pas juste une suite de chiffres) évite de capter par
  // erreur un kilométrage de leasing (ex. "15 000 km") qui tomberait sinon
  // dans la même fourchette numérique.
  const symbol = CURRENCY_SYMBOLS[currency] ?? "€";
  const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const numberPart = "[\\d](?:[\\d\\s.,]|&nbsp;)*";
  const separator = "(?:&nbsp;|\\s)?";
  const priceRegex = new RegExp(
    `(?:${numberPart}${separator}${escapedSymbol})|(?:${escapedSymbol}${separator}${numberPart})`,
    "g"
  );

  const [minPlausible, maxPlausible] = PLAUSIBLE_PRICE_RANGE[currency] ?? [15000, 200000];
  const priceMatches = [...html.matchAll(priceRegex)]
    .map((m) => parseLocalizedPrice(m[0].replace(new RegExp(escapedSymbol, "g"), "")))
    .filter((n) => Number.isFinite(n) && n >= minPlausible && n <= maxPlausible);

  if (priceMatches.length === 0) {
    return [];
  }

  const price = Math.min(...priceMatches);

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

  let lastError: unknown;
  let lastHtml: string | undefined;

  // Taille observée d'un rendu complet et réussi : ~1,2 à 1,6 million de
  // caractères (page configurateur entièrement hydratée). Un rendu raté
  // (ScraperAPI renvoie parfois un 200 avec seulement le squelette HTML
  // initial, ~12 000 caractères — repéré le 30/08/2026 sur model-s, mais
  // ça peut arriver ponctuellement sur n'importe quel modèle/pays) est donc
  // largement en-dessous de ce seuil.
  const MIN_HTML_LENGTH = 200000;

  // 3 tentatives, 75s par tentative : le relevé quotidien passe par le
  // workflow GitHub Actions (.github/workflows/check-prices.yml), sans
  // limite de temps stricte contrairement aux fonctions serverless Vercel.
  // On réessaie sur timeout/erreur réseau, 429 (trop de requêtes
  // simultanées), tout 5xx (erreur transitoire côté ScraperAPI ou de la
  // cible relayée), et maintenant aussi sur une page anormalement courte
  // (rendu JS incomplet côté ScraperAPI, même avec un 200 OK).
  //
  // cache: "no-store" indispensable : Next.js met en cache les appels
  // fetch() par défaut (même à l'intérieur d'une route dynamique) — repéré
  // le 30/08/2026 en observant une "2e tentative" répondre en 442ms au lieu
  // des dizaines de secondes habituelles, avec exactement la même réponse
  // (tronquée) que la première. Sans ce paramètre, les tentatives de retry
  // pouvaient renvoyer une page ratée mise en cache au lieu de retenter
  // réellement le réseau.
  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(85000),
        cache: "no-store",
      });

      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`Statut ${response.status}`);
      } else if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Échec de récupération de la page: ${response.status} ${body.slice(0, 300)}`);
      } else {
        const html = await response.text();
        lastHtml = html;
        if (html.length >= MIN_HTML_LENGTH) {
          return html;
        }
        lastError = new Error(`Page anormalement courte (${html.length} caractères)`);
      }
    } catch (err) {
      lastError = err;
    }
    if (attempt < MAX_ATTEMPTS - 1) {
      await sleep(3000 * (attempt + 1));
    }
  }

  // Toutes les tentatives ont renvoyé une page trop courte (ou ont échoué) :
  // on utilise quand même le dernier HTML obtenu si on en a un — parfois la
  // page est complète mais simplement plus courte que le seuil (ex. un
  // modèle avec moins d'options) — sinon on remonte l'erreur.
  if (lastHtml !== undefined) {
    return lastHtml;
  }

  throw new Error(
    `Échec de récupération de la page: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

export async function fetchPricesForModel(
  countryCode: string,
  modelSlug: string
): Promise<PriceResult[]> {
  const targetUrl = buildTeslaConfiguratorUrl(countryCode, modelSlug);
  const html = await fetchRenderedHtml(targetUrl);
  return parseConfiguratorPrice(html, countryCode, modelSlug);
}
