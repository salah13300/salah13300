import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ creatorId: z.string() });

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "FAN") {
    return NextResponse.json({ error: "Réservé aux comptes fan." }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const creator = await prisma.creatorProfile.findUnique({ where: { id: parsed.data.creatorId } });
  if (!creator) return NextResponse.json({ error: "Créateur introuvable." }, { status: 404 });

  const conversation = await prisma.conversation.upsert({
    where: { fanId_creatorId: { fanId: session.user.id, creatorId: creator.id } },
    update: {},
    create: { fanId: session.user.id, creatorId: creator.id },
  });

  return NextResponse.json({ id: conversation.id });
}
