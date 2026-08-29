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

  const message = await prisma.message.findUnique({
    where: { id: params.id },
    include: { conversation: { include: { creator: true } } },
  });
  if (!message || message.conversation.fanId !== session.user.id) {
    return NextResponse.json({ error: "Message introuvable." }, { status: 404 });
  }
  if (message.priceCents <= 0) return NextResponse.json({ unlocked: true });

  const unlockedBy: string[] = JSON.parse(message.unlockedBy);
  if (unlockedBy.includes(session.user.id)) return NextResponse.json({ unlocked: true });

  try {
    await debitWallet({
      userId: session.user.id,
      amountCents: message.priceCents,
      type: TransactionType.PPV_UNLOCK,
      creatorId: message.conversation.creator.id,
      metadata: { messageId: message.id },
    });
  } catch (e) {
    if (e instanceof InsufficientFundsError) {
      return NextResponse.json({ error: "Solde insuffisant." }, { status: 402 });
    }
    throw e;
  }

  unlockedBy.push(session.user.id);
  await prisma.message.update({
    where: { id: message.id },
    data: { unlockedBy: JSON.stringify(unlockedBy) },
  });

  return NextResponse.json({ unlocked: true });
}
