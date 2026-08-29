import { NextResponse } from "next/server";
import { checkAllPrices } from "@/lib/priceCheck";

// Cette route est appelée périodiquement par le cron (voir vercel.json).
// 13 pays x 5 modèles = 65 relevés séquentiels, chacun avec un appel réseau
// vers l'API Tesla : ça peut prendre plus que les 10s par défaut de Vercel.
export const maxDuration = 60;

export async function POST(request: Request) {
  // Sécurité minimale : vérifier un secret partagé pour éviter les appels non autorisés
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const result = await checkAllPrices();

  return NextResponse.json({ status: "ok", ...result });
}
