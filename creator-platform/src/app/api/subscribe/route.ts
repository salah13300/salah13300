import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { debitWallet, InsufficientFundsError } from "@/lib/payments";
import { TransactionType } from "@/lib/enums";
import { z } from "zod";

const schema = z.object({ creatorId: z.string() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "FAN") {
    return NextResponse.json({ error: "Réservé aux comptes fan." }, { status: 401 });
  }
  if (!session.user.ageVerified) {
    return NextResponse.json({ error: "Vérification de majorité requise." }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const creator = await prisma.creatorProfile.findUnique({ where: { id: parsed.data.creatorId } });
  if (!creator || creator.status !== "APPROVED") {
    return NextResponse.json({ error: "Créateur introuvable." }, { status: 404 });
  }

  const existing = await prisma.subscription.findUnique({
    where: { fanId_creatorId: { fanId: session.user.id, creatorId: creator.id } },
  });
  if (existing?.active) {
    return NextResponse.json({ error: "Déjà abonné." }, { status: 409 });
  }

  try {
    await debitWallet({
      userId: session.user.id,
      amountCents: creator.subscriptionPriceCents,
      type: TransactionType.SUBSCRIPTION,
      creatorId: creator.id,
      metadata: { creatorHandle: creator.handle },
    });
  } catch (e) {
    if (e instanceof InsufficientFundsError) {
      return NextResponse.json({ error: "Solde insuffisant. Rechargez votre portefeuille." }, { status: 402 });
    }
    throw e;
  }

  const renewsAt = new Date();
  renewsAt.setDate(renewsAt.getDate() + 30);

  const subscription = await prisma.subscription.upsert({
    where: { fanId_creatorId: { fanId: session.user.id, creatorId: creator.id } },
    update: { active: true, renewsAt, cancelledAt: null, priceCents: creator.subscriptionPriceCents },
    create: {
      fanId: session.user.id,
      creatorId: creator.id,
      priceCents: creator.subscriptionPriceCents,
      renewsAt,
    },
  });

  return NextResponse.json({ subscriptionId: subscription.id, renewsAt: subscription.renewsAt });
}
