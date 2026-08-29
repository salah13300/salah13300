import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/news?email=xxx
// Réservé aux comptes avec abonnement Stripe actif.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json({ error: "email requis" }, { status: 400 });
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
