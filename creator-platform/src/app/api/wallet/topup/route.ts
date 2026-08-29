import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { mockTopUpWallet } from "@/lib/payments";
import { z } from "zod";

const schema = z.object({ amountCents: z.number().int().min(500).max(100000) });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Montant invalide." }, { status: 400 });
  }

  const { user } = await mockTopUpWallet(session.user.id, parsed.data.amountCents);
  return NextResponse.json({ walletBalanceCents: user.walletBalanceCents });
}
