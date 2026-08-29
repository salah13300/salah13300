import { NextResponse } from "next/server";
import { checkAllPrices } from "@/lib/priceCheck";

// Cette route est appelée périodiquement par le cron (voir vercel.json).
// 13 pays x 5 modèles = 65 relevés séquentiels, chacun via un navigateur
// headless (voir lib/scraper.ts) : nécessite largement plus que les 10s par
// défaut de Vercel. 300s = maximum généralement disponible sur un plan Pro ;
// si ça ne suffit toujours pas, il faudra répartir les relevés sur plusieurs
// cron plus fréquents (par pays, par ex.) plutôt que tout faire d'un coup.
export const maxDuration = 300;

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
