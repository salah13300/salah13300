import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contentSchema } from "@/lib/validation";

// En prod : passage obligatoire par la modération IA + humaine avant publication (section 4.4),
// et stockage sur S3/CDN avec URLs signées courte durée (section 4.1) — ici mediaUrl est fournie
// telle quelle (MVP) et supposée déjà hébergée par le créateur (ex: lien d'image de démo).
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.user.role !== "CREATOR") {
    return NextResponse.json({ error: "Réservé aux comptes créateur." }, { status: 401 });
  }

  const profile = await prisma.creatorProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) {
    return NextResponse.json({ error: "Profil créateur non configuré." }, { status: 400 });
  }

  const parsed = contentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });
  }

  const content = await prisma.content.create({
    data: { ...parsed.data, creatorId: profile.id },
  });

  return NextResponse.json({ id: content.id });
}
