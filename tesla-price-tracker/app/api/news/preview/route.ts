import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/news/preview
// Public, sans authentification — sert d'accroche sur la page d'accueil.
// Le fil complet reste réservé aux abonnés (voir /api/news).
// Sans ce flag, Next.js tente de prérendre cette route statiquement au
// build (elle n'a pas de paramètre qui la rendrait dynamique automatiquement),
// ce qui échoue si la base n'est pas joignable pendant `next build` et fige
// de toute façon les actus au contenu du moment du build.
export const dynamic = "force-dynamic";

export async function GET() {
  const news = await prisma.newsItem.findMany({
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  return NextResponse.json({ news });
}
