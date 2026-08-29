import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionEmail } from "@/lib/auth";

// GET /api/news
// Réservé aux comptes connectés (cookie de session) avec un abonnement
// Stripe actif. L'email vient de la session, jamais d'un paramètre envoyé
// par le client — sinon n'importe qui pourrait lire les actus de n'importe
// quel abonné en devinant/connaissant son email.
export const dynamic = "force-dynamic";

export async function GET() {
  const email = getSessionEmail();

  if (!email) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.subscriptionStatus !== "active") {
    return NextResponse.json(
      { error: "Abonnement payant requis" },
      { status: 402 }
    );
  }

  const news = await prisma.newsItem.findMany({
    orderBy: { publishedAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ news });
}
