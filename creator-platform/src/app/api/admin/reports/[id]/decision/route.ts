import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ status: z.enum(["ACTIONED", "DISMISSED"]) });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session || (session.user.role !== "MODERATOR" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const report = await prisma.report.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
  });

  await prisma.moderationLog.create({
    data: {
      moderatorId: session.user.id,
      action: `REPORT_${parsed.data.status}`,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
    },
  });

  return NextResponse.json({ status: report.status });
}
