import { prisma } from "./db";
import { fetchPricesForModel, type PriceResult } from "./scraper";
import { sendPriceDropAlert } from "./notify";
import { COUNTRIES, MODELS } from "./countries";

async function checkPricesForModelAndCountry(
  countryCode: string,
  modelSlug: string,
  currency: string
) {
  const prices: PriceResult[] = await fetchPricesForModel(countryCode, modelSlug);

  for (const price of prices) {
    // 1. Enregistrer le relevé
    await prisma.priceSnapshot.create({
      data: {
        country: price.country,
        model: price.model,
        trim: price.trim,
        priceCents: price.priceCents,
        currency: price.currency || currency,
      },
    });

    // 2. Vérifier si c'est un nouveau plus bas historique
    const previousMin = await prisma.priceSnapshot.aggregate({
      where: {
        country: price.country,
        model: price.model,
        trim: price.trim,
      },
      _min: { priceCents: true },
    });

    const isNewLow =
      previousMin._min.priceCents === null ||
      price.priceCents < previousMin._min.priceCents;

    if (!isNewLow) continue;

    // 3. Notifier les abonnés concernés (uniquement les comptes payants actifs)
    const matchingAlerts = await prisma.priceAlert.findMany({
      where: {
        country: price.country,
        model: price.model,
        OR: [{ trim: null }, { trim: price.trim }],
        user: { subscriptionStatus: "active" },
      },
      include: { user: true },
    });

    for (const alert of matchingAlerts) {
      await sendPriceDropAlert({
        to: alert.user.email,
        model: price.model,
        trim: price.trim,
        country: price.country,
        newPriceCents: price.priceCents,
        currency: price.currency || currency,
      });

      await prisma.alertSent.create({
        data: { priceAlertId: alert.id, priceCents: price.priceCents },
      });
    }
  }
}

export interface CheckPricesResult {
  checked: number;
  failed: { country: string; model: string; error: string }[];
}

// Nombre de relevés menés en parallèle. Un plan d'entrée/essai ScraperAPI
// autorise en général peu de requêtes simultanées — 10 a déclenché des 429
// ("trop de requêtes") en production, d'où un palier à 3. Testé à 5 le
// 29/08/2026 (pour que les 5 modèles d'un pays partent en une seule vague) :
// résultat pire qu'à 3 (0/5 réussis contre 2/5), sans doute parce que 5
// requêtes simultanées saturent le pool d'IP résidentielles de ScraperAPI et
// ralentissent chaque requête individuelle au point de dépasser le timeout
// client. Redescendu à 2 (marge supplémentaire sous la limite de 5 threads
// du plan ScraperAPI, cf. dashboard) — ne pas remonter sans revalider en
// prod.
const CONCURRENCY = 2;

async function runChecks(
  tasks: { country: (typeof COUNTRIES)[number]; model: (typeof MODELS)[number] }[]
): Promise<CheckPricesResult> {
  const failed: CheckPricesResult["failed"] = [];
  let checked = 0;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tasks.length) {
      const { country, model } = tasks[nextIndex++];
      try {
        await checkPricesForModelAndCountry(country.code, model.slug, country.currency);
        checked++;
      } catch (err) {
        console.error(`Erreur pour ${model.slug}/${country.code}:`, err);
        failed.push({
          country: country.code,
          model: model.slug,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      // Petite pause entre deux relevés d'un même worker : sans limite de
      // temps stricte (voir GitHub Actions), on peut se permettre un trafic
      // moins en rafale — les échecs quasi systématiques observés le
      // 29/08/2026 après plusieurs runs de test rapprochés dans la journée
      // suggèrent une détection anti-bot Tesla/Akamai plus agressive face à
      // un volume de requêtes automatisées groupées.
      if (nextIndex < tasks.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  return { checked, failed };
}

// Parcourt tous les pays/modèles suivis (13 x 5 = 65 relevés). Utilisé par
// le script `check-prices` (exécution manuelle/CI, pas de limite de temps).
// Trop lent pour une seule invocation serverless (testé en prod : dépasse
// même 300s) — la route cron utilise `checkPricesForCountry` à la place,
// un pays à la fois (voir vercel.json, un cron par pays).
export async function checkAllPrices(): Promise<CheckPricesResult> {
  const tasks = COUNTRIES.flatMap((country) => MODELS.map((model) => ({ country, model })));
  return runChecks(tasks);
}

// Ne vérifie qu'un seul pays (5 modèles) — taille de lot adaptée à une
// fonction serverless avec un temps d'exécution limité. Utilisé par le
// script `check-prices` (pas de contrainte de temps).
export async function checkPricesForCountry(countryCode: string): Promise<CheckPricesResult> {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  if (!country) {
    throw new Error(`Pays inconnu: ${countryCode}`);
  }

  const tasks = MODELS.map((model) => ({ country, model }));
  return runChecks(tasks);
}

// Ne vérifie qu'un sous-ensemble de modèles pour un pays. Utilisé par la
// route cron en production : vérifié le 29/08/2026 que 5 modèles en une
// seule invocation (CONCURRENCY=3, donc 2 vagues) échouent parfois par
// timeout même après optimisation des tentatives — la latence de
// ScraperAPI/Tesla est trop variable pour tenir de façon fiable dans
// maxDuration (290s). En répartissant les 5 modèles d'un pays sur 2 crons
// (voir vercel.json), chaque invocation garde une marge confortable.
export async function checkPricesForCountryModels(
  countryCode: string,
  modelSlugs: string[]
): Promise<CheckPricesResult> {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  if (!country) {
    throw new Error(`Pays inconnu: ${countryCode}`);
  }

  const models = MODELS.filter((m) => modelSlugs.includes(m.slug));
  const tasks = models.map((model) => ({ country, model }));
  return runChecks(tasks);
}
