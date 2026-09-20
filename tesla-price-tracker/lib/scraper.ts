/**
 * Scraper des prix Tesla neufs.
 *
 * PIVOT 1 (30/08/2026) : l'approche précédente (API d'inventaire
 * /inventory/api/v4/inventory-results) est abandonnée au profit d'un scrap
 * direct de la page configurateur publique (ex.
 * tesla.com/fr_fr/model3/design#overview), qui affiche le prix catalogue de
 * la configuration de base — toujours disponible, que du stock existe ou
 * non. Le prix n'est pas présent dans le HTML initial (récupéré par Tesla
 * via un appel séparé vers sa "pricing gateway" après chargement) : il faut
 * un rendu JS complet pour laisser cet appel se terminer avant de lire le
 * HTML final.
 *
 * PIVOT 2 (20/09/2026) : ScraperAPI (utilisé jusque-là comme proxy de rendu
 * pour passer la protection anti-bot Akamai de tesla.com) est abandonné —
 * coût mensuel ($49/mois) disproportionné pour ~26 relevés/jour (13 pays x
 * Model 3/Y). Remplacé par un navigateur headless local (Playwright,
 * gratuit, voir fetchRenderedHtmlBrowser) lancé directement dans le
 * workflow GitHub Actions. Repli : si l'extraction par regex échoue, un
 * agent IA (lib/aiAgent.ts, Claude Haiku) tente d'extraire le prix à partir
 * des extraits de texte contenant le symbole monétaire — plus robuste si
 * Tesla change la structure de sa page, mais plus lent/coûteux, donc
 * utilisé uniquement en dernier recours.
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

import { chromium, type Browser } from "playwright";
import { COUNTRIES, MODELS } from "./countries";
import { extractPriceWithAI } from "./aiAgent";

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

// Navigateur headless partagé entre tous les relevés d'un même run (voir
// lib/priceCheck.ts) : lancer un navigateur par relevé serait beaucoup plus
// lent et gourmand en mémoire. Chaque relevé ouvre son propre contexte
// (cookies isolés) puis le referme — voir fetchRenderedHtmlBrowser.
let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

// À appeler une fois tous les relevés terminés (voir scripts/check-prices.ts)
// pour que le process Node se termine proprement au lieu de rester bloqué
// par un navigateur encore ouvert.
export async function closeBrowser(): Promise<void> {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Taille observée d'un rendu complet et réussi : ~1,2 à 1,6 million de
// caractères (page configurateur entièrement hydratée). Un rendu raté
// (page interrompue avant la fin du chargement JS) est donc largement
// en-dessous de ce seuil.
const MIN_HTML_LENGTH = 200000;

export async function fetchRenderedHtmlBrowser(targetUrl: string): Promise<string> {
  const browser = await getBrowser();
  let lastError: unknown;
  let lastHtml: string | undefined;

  // 3 tentatives : on réessaie sur timeout/erreur réseau et sur une page
  // anormalement courte (rendu JS incomplet, challenge anti-bot affiché à
  // la place du contenu...). Chaque tentative utilise un contexte neuf
  // (cookies/session repartis à zéro) plutôt que de réutiliser la même
  // page, au cas où une tentative précédente aurait laissé la page dans un
  // état bloqué (ex. bannière de consentement cookies jamais fermée).
  const MAX_ATTEMPTS = 3;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const context = await browser.newContext({ userAgent: USER_AGENT });
    try {
      const page = await context.newPage();
      const response = await page.goto(targetUrl, {
        waitUntil: "networkidle",
        timeout: 45000,
      });

      if (response && response.status() >= 500) {
        lastError = new Error(`Statut ${response.status()}`);
      } else if (response && response.status() >= 400) {
        // Modèle non commandable sur ce marché (redirection vers
        // l'inventaire d'occasion, 404...) : comportement attendu pour
        // Model S/X/Cybertruck en Europe (voir docstring en haut du
        // fichier), pas la peine de réessayer — on renvoie le HTML tel
        // quel, parseConfiguratorPrice ne trouvera simplement aucun prix.
        return await page.content();
      } else {
        // Laisse le temps à l'appel JS vers la "pricing gateway" Tesla de
        // se terminer après le networkidle initial (voir docstring).
        await page.waitForTimeout(4000);
        const html = await page.content();
        lastHtml = html;
        if (html.length >= MIN_HTML_LENGTH) {
          return html;
        }
        lastError = new Error(`Page anormalement courte (${html.length} caractères)`);
      }
    } catch (err) {
      lastError = err;
    } finally {
      await context.close();
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

// Extraits de texte autour de chaque occurrence du symbole monétaire —
// passés à l'agent IA (lib/aiAgent.ts) en repli quand la regex ci-dessus ne
// trouve rien. Volontairement plus permissif que parseConfiguratorPrice
// (pas de filtre par fourchette plausible) : c'est justement le rôle de
// l'IA de trancher parmi des candidats bruts.
function extractCandidateSnippets(html: string, currency: string): string[] {
  const symbol = CURRENCY_SYMBOLS[currency] ?? "€";
  const escapedSymbol = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const contextRegex = new RegExp(`.{0,60}${escapedSymbol}.{0,20}|.{0,20}${escapedSymbol}.{0,60}`, "g");
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ");
  const matches = [...text.matchAll(contextRegex)].map((m) => m[0].trim()).filter(Boolean);
  return [...new Set(matches)].slice(0, 40);
}

export async function fetchPricesForModel(
  countryCode: string,
  modelSlug: string
): Promise<PriceResult[]> {
  const targetUrl = buildTeslaConfiguratorUrl(countryCode, modelSlug);
  const html = await fetchRenderedHtmlBrowser(targetUrl);

  const regexResult = parseConfiguratorPrice(html, countryCode, modelSlug);
  if (regexResult.length > 0) {
    return regexResult;
  }

  // Repli IA : la regex n'a rien trouvé (page inhabituelle, structure
  // modifiée...) — voir docstring en haut du fichier. Pas de coût/latence
  // supplémentaire dans le cas normal, uniquement en cas d'échec.
  const country = COUNTRIES.find((c) => c.code === countryCode);
  const currency = country?.currency ?? "EUR";
  const snippets = extractCandidateSnippets(html, currency);
  const aiPrice = await extractPriceWithAI(snippets, currency);
  if (aiPrice === null) {
    return [];
  }

  return [
    {
      country: countryCode,
      model: modelSlug,
      trim: "Standard",
      priceCents: Math.round(aiPrice * 100),
      currency,
    },
  ];
}
