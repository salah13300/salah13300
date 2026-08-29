import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { debitWallet, InsufficientFundsError } from "@/lib/payments";
import { TransactionType } from "@/lib/enums";
import { z } from "zod";

const schema = z.object({ creatorId: z.string(), amountCents: z.number().int().min(100).max(50000) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "FAN") {
    return NextResponse.json({ error: "Réservé aux comptes fan." }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const creator = await prisma.creatorProfile.findUnique({ where: { id: parsed.data.creatorId } });
  if (!creator) return NextResponse.json({ error: "Créateur introuvable." }, { status: 404 });

  try {
    await debitWallet({
      userId: session.user.id,
      amountCents: parsed.data.amountCents,
      type: TransactionType.TIP,
      creatorId: creator.id,
    });
  } catch (e) {
    if (e instanceof InsufficientFundsError) {
      return NextResponse.json({ error: "Solde insuffisant." }, { status: 402 });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
