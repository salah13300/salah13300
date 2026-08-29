import { NextResponse } from "next/server";
import { checkAllPrices } from "@/lib/priceCheck";

// Cette route est appelée une fois par jour par le cron (voir vercel.json).
// 13 pays x 5 modèles = 65 relevés, faits par lots en parallèle
// (lib/priceCheck.ts) via ScraperAPI : plus léger qu'un navigateur headless,
// mais toujours plus que les 10s par défaut de Vercel.
export const maxDuration = 120;

// Les Cron Jobs Vercel déclenchent toujours une requête GET (avec le header
// Authorization signé automatiquement à partir de la variable d'env
// CRON_SECRET) — jamais POST, même si le vercel.json ne le précise pas.
export async function GET(request: Request) {
  // Sécurité minimale : vérifier un secret partagé pour éviter les appels non autorisés
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const result = await checkAllPrices();

  return NextResponse.json({ status: "ok", ...result });
}
