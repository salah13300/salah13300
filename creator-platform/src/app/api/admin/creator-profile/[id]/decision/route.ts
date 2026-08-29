import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ approve: z.boolean(), reason: z.string().optional() });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.user.role !== "MODERATOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const profile = await prisma.creatorProfile.update({
    where: { id: params.id },
    data: {
      status: parsed.data.approve ? "APPROVED" : "REJECTED",
      rejectionReason: parsed.data.approve ? null : parsed.data.reason,
    },
  });

  // Journalisation immuable des actions de modération (section 4.4).
  await prisma.moderationLog.create({
    data: {
      moderatorId: session.user.id,
      action: parsed.data.approve ? "APPROVE_CREATOR_PROFILE" : "REJECT_CREATOR_PROFILE",
      targetType: "creatorProfile",
      targetId: profile.id,
      reason: parsed.data.reason ?? "",
    },
  });

  return NextResponse.json({ status: profile.status });
}
