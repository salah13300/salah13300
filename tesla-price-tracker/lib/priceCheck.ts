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
// ("trop de requêtes") en production, d'où un palier à 3 initialement. Mais
// avec 3 (< 5 modèles/pays), `checkPricesForCountry` doit traiter les tâches
// en 2 vagues, ce qui a fait dépasser le budget de temps de la fonction
// (maxDuration 290s) et provoqué des timeouts sur les derniers modèles
// (vérifié en prod le 29/08/2026 : 2 modèles sur 5 en échec par timeout,
// aucun 403/429). Remonté à 5 pour que les 5 modèles d'un pays partent en
// une seule vague — si de nouveaux 429 apparaissent, redescendre plutôt que
// remonter au-delà de la limite du plan ScraperAPI.
const CONCURRENCY = 5;

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
// fonction serverless avec un temps d'exécution limité.
export async function checkPricesForCountry(countryCode: string): Promise<CheckPricesResult> {
  const country = COUNTRIES.find((c) => c.code === countryCode);
  if (!country) {
    throw new Error(`Pays inconnu: ${countryCode}`);
  }

  const tasks = MODELS.map((model) => ({ country, model }));
  return runChecks(tasks);
}
