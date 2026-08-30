import { NextResponse } from "next/server";
import { fetchRawInventoryForDebug } from "@/lib/scraper";
import { countrySchema, modelSchema } from "@/lib/validation";

// Route de diagnostic temporaire (à supprimer une fois le problème résolu) :
// appelle fetchPricesForModel SANS écrire en base, pour voir exactement ce
// que Tesla/ScraperAPI renvoie — utile pour distinguer "0 résultat trouvé
// dans la réponse" (silencieux, compté comme un succès par priceCheck.ts)
// d'un vrai échec réseau.
export const maxDuration = 90;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsedCountry = countrySchema.safeParse(searchParams.get("country") ?? "FR");
  const parsedModel = modelSchema.safeParse(searchParams.get("model") ?? "model-3");

  if (!parsedCountry.success || !parsedModel.success) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  try {
    const { targetUrl, status, raw } = await fetchRawInventoryForDebug(
      parsedCountry.data,
      parsedModel.data
    );
    return NextResponse.json({
      country: parsedCountry.data,
      model: parsedModel.data,
      scraperApiStatus: status,
      targetUrl,
      raw,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
