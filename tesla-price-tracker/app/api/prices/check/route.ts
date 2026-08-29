import { NextResponse } from "next/server";
import { checkAllPrices, checkPricesForCountry } from "@/lib/priceCheck";
import { countrySchema } from "@/lib/validation";

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

  if (countryParam) {
    const parsed = countrySchema.safeParse(countryParam);
    if (!parsed.success) {
      return NextResponse.json({ error: "Paramètre 'country' invalide" }, { status: 400 });
    }
    const result = await checkPricesForCountry(parsed.data);
    return NextResponse.json({ status: "ok", country: parsed.data, ...result });
  }

  // Sans paramètre : vérifie tous les pays (utile en local/CI où le temps
  // d'exécution n'est pas contraint — voir scripts/check-prices.ts).
  const result = await checkAllPrices();
  return NextResponse.json({ status: "ok", ...result });
}
