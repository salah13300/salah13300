import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// POST /api/subscribe
// body: { email, country, model, trim? }
// Crée une alerte de prix — réservé aux comptes avec un abonnement Stripe actif.
export async function POST(request: Request) {
  const body = await request.json();
  const { email, country, model, trim } = body;

  if (!email || !country || !model) {
    return NextResponse.json(
      { error: "email, country et model sont requis" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.subscriptionStatus !== "active") {
    return NextResponse.json(
      { error: "Abonnement payant requis avant de créer une alerte" },
      { status: 402 } // 402 Payment Required
    );
  }

  const alert = await prisma.priceAlert.create({
    data: { userId: user.id, country, model, trim: trim ?? null },
  });

  return NextResponse.json({ id: alert.id, status: "active" });
}
