import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { subscribeSchema } from "@/lib/validation";
import { isRateLimited } from "@/lib/rateLimit";

// POST /api/subscribe
// body: { email, country, model, trim? }
// Crée une alerte de prix — réservé aux comptes avec un abonnement Stripe actif.
export async function POST(request: Request) {
  if (await isRateLimited(request, "subscribe", { limit: 10, windowSeconds: 60 })) {
    return NextResponse.json({ error: "Trop de requêtes, réessaie plus tard." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "email, country et model sont requis et doivent être valides" },
      { status: 400 }
    );
  }

  const { email, country, model, trim } = parsed.data;

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
