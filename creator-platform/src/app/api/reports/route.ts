import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  targetType: z.enum(["content", "message", "creatorProfile"]),
  targetId: z.string(),
  reason: z.string().min(3).max(1000),
});

// Signalement utilisateur facilité (section 4.4) — traitement prioritaire côté modération.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const report = await prisma.report.create({
    data: { reporterId: session.user.id, ...parsed.data },
  });

  return NextResponse.json({ id: report.id });
}
