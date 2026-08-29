import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { debitWallet, InsufficientFundsError } from "@/lib/payments";
import { TransactionType } from "@/lib/enums";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || session.user.role !== "FAN") {
    return NextResponse.json({ error: "Réservé aux comptes fan." }, { status: 401 });
  }

  const content = await prisma.content.findUnique({ where: { id: params.id } });
  if (!content || content.visibility !== "PAY_PER_VIEW") {
    return NextResponse.json({ error: "Contenu introuvable." }, { status: 404 });
  }

  const already = await prisma.contentUnlock.findUnique({
    where: { contentId_userId: { contentId: content.id, userId: session.user.id } },
  });
  if (already) return NextResponse.json({ unlocked: true });

  try {
    await debitWallet({
      userId: session.user.id,
      amountCents: content.priceCents,
      type: TransactionType.PPV_UNLOCK,
      creatorId: content.creatorId,
      metadata: { contentId: content.id },
    });
  } catch (e) {
    if (e instanceof InsufficientFundsError) {
      return NextResponse.json({ error: "Solde insuffisant. Rechargez votre portefeuille." }, { status: 402 });
    }
    throw e;
  }

  await prisma.contentUnlock.create({ data: { contentId: content.id, userId: session.user.id } });

  return NextResponse.json({ unlocked: true });
}
