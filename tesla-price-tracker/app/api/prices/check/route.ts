import { NextResponse } from "next/server";
import { checkAllPrices, checkPricesForCountry, checkPricesForCountryModels } from "@/lib/priceCheck";
import { countrySchema, modelsListSchema } from "@/lib/validation";

// Le relevé quotidien automatique passe maintenant par le workflow GitHub
// Actions .github/workflows/check-prices.yml (script scripts/check-prices.ts,
// sans limite de temps) plutôt que par un cron Vercel : testé en prod le
// 29/08/2026, les fonctions serverless Vercel (limitées à 300s même avec un
// pays/quelques modèles à la fois) échouaient encore par timeout de façon
// intermittente à cause de la latence variable de ScraperAPI/Tesla (voir
// lib/scraper.ts). Cette route reste utile pour un déclenchement manuel/debug
// (curl ou fetch() avec le header Authorization ci-dessous).
export const maxDuration = 290;
// Empêche Vercel de mettre en cache la réponse de cette route (voir
// lib/scraper.ts pour le détail du bug de cache repéré le 30/08/2026 sur
// une route similaire — une réponse ratée pouvait être resservie telle
// quelle sur un appel identique suivant).
export const dynamic = "force-dynamic";

// Toujours en GET : c'était historiquement le cron Vercel qui appelait cette
// route (toujours en GET, jamais POST), conservé pour un appel manuel simple.
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

    // 'models' optionnel : ne vérifie qu'un sous-ensemble des modèles du
    // pays — pratique pour un test manuel ciblé sans attendre les 5 modèles.
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
