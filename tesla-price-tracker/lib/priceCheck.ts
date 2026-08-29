import type { Browser } from "playwright-core";
import { prisma } from "./db";
import { fetchPricesForModelViaBrowser, launchScraperBrowser, type PriceResult } from "./scraper";
import { sendPriceDropAlert } from "./notify";
import { COUNTRIES, MODELS } from "./countries";

async function checkPricesForModelAndCountry(
  browser: Browser,
  countryCode: string,
  modelSlug: string,
  currency: string
) {
  const prices: PriceResult[] = await fetchPricesForModelViaBrowser(browser, countryCode, modelSlug);

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

export interface CheckAllPricesResult {
  checked: number;
  failed: { country: string; model: string; error: string }[];
}

// Parcourt tous les pays/modèles suivis, enregistre les relevés de prix et
// notifie les abonnés en cas de nouveau plus bas. Utilisé à la fois par le
// script `check-prices` (exécution manuelle/CI) et par la route
// `/api/prices/check` (cron Vercel).
//
// Un seul navigateur headless est lancé et réutilisé pour les 65 relevés
// (13 pays x 5 modèles) — le lancer à chaque fois serait beaucoup trop lent
// pour tenir dans le temps d'exécution d'une fonction serverless.
export async function checkAllPrices(): Promise<CheckAllPricesResult> {
  const failed: CheckAllPricesResult["failed"] = [];
  let checked = 0;

  const browser = await launchScraperBrowser();

  try {
    for (const country of COUNTRIES) {
      for (const model of MODELS) {
        try {
          await checkPricesForModelAndCountry(browser, country.code, model.slug, country.currency);
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
  } finally {
    await browser.close();
  }

  return { checked, failed };
}
