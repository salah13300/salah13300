import { NextResponse } from "next/server";
import { checkAllPrices, checkPricesForCountry, checkPricesForCountryModels } from "@/lib/priceCheck";
import { countrySchema, modelsListSchema } from "@/lib/validation";

// Cette route est appelée par le cron (voir vercel.json) : un cron par pays,
// staggerés dans le temps, plutôt qu'un seul cron qui ferait les 13 pays x 5
// modèles d'un coup — testé en prod, ça dépasse largement le temps
// d'exécution disponible (même 300s) une fois les requêtes relayées via
// ScraperAPI (contournement du blocage anti-bot Tesla, voir lib/scraper.ts).
export const maxDuration = 290;

// Les Cron Jobs Vercel déclenchent toujours une requête GET (avec le header
// Authorization signé automatiquement à partir de la variable d'env
// CRON_SECRET) — jamais POST, même si le vercel.json ne le précise pas.
export async function GET(request: Request) {
  // Sécurité minimale : vérifier un secret partagé pour éviter les appels non autorisés
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const countryParam = searchParams.get("country");
  const modelsParam = searchParams.get("models");

  if (countryParam) {
    const parsed = countrySchema.safeParse(countryParam);
    if (!parsed.success) {
      return NextResponse.json({ error: "Paramètre 'country' invalide" }, { status: 400 });
    }

    // 'models' optionnel : ne vérifie qu'un sous-ensemble des 5 modèles du
    // pays (voir vercel.json, un pays est réparti sur 2 crons pour rester
    // dans le budget de temps — voir lib/priceCheck.ts).
    if (modelsParam) {
      const parsedModels = modelsListSchema.safeParse(modelsParam);
      if (!parsedModels.success) {
        return NextResponse.json({ error: "Paramètre 'models' invalide" }, { status: 400 });
      }
      const result = await checkPricesForCountryModels(parsed.data, parsedModels.data);
      return NextResponse.json({
        status: "ok",
        country: parsed.data,
        models: parsedModels.data,
        ...result,
      });
    }

    const result = await checkPricesForCountry(parsed.data);
    return NextResponse.json({ status: "ok", country: parsed.data, ...result });
  }

  // Sans paramètre : vérifie tous les pays (utile en local/CI où le temps
  // d'exécution n'est pas contraint — voir scripts/check-prices.ts).
  const result = await checkAllPrices();
  return NextResponse.json({ status: "ok", ...result });
}
