import { NextResponse } from "next/server";

// Cette route est appelée périodiquement par le cron (voir vercel.json).
// Elle réutilise la même logique que scripts/check-prices.ts.
// Pour rester simple, tu peux soit importer directement la logique ici,
// soit garder le script séparé et l'exécuter via GitHub Actions à la place
// du cron Vercel (plus flexible, pas de limite de durée d'exécution).

export async function POST(request: Request) {
  // Sécurité minimale : vérifier un secret partagé pour éviter les appels non autorisés
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // TODO: appeler ici la même logique que scripts/check-prices.ts
  // (factoriser dans lib/ si tu veux éviter la duplication)

  return NextResponse.json({ status: "ok" });
}
