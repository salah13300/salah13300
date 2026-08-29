import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { creatorProfileSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = creatorProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });
  }

  const existing = await prisma.creatorProfile.findUnique({ where: { userId: session.user.id } });
  if (existing) {
    return NextResponse.json({ error: "Profil créateur déjà existant." }, { status: 409 });
  }

  const handleTaken = await prisma.creatorProfile.findUnique({ where: { handle: parsed.data.handle } });
  if (handleTaken) {
    return NextResponse.json({ error: "Ce nom d'utilisateur est déjà pris." }, { status: 409 });
  }

  // Le RIB/IBAN serait en prod transmis directement au prestataire de paiement pour les
  // reversements (section 3.6), jamais stocké tel quel côté applicatif. Ici on ne le persiste
  // pas du tout — on simule seulement la validation de sa présence.
  const profile = await prisma.creatorProfile.create({
    data: {
      userId: session.user.id,
      handle: parsed.data.handle,
      displayName: parsed.data.displayName,
      bio: parsed.data.bio,
      subscriptionPriceCents: parsed.data.subscriptionPriceCents,
      contractSignedAt: new Date(),
      status: "PENDING_REVIEW",
    },
  });

  return NextResponse.json({ id: profile.id, status: profile.status });
}
