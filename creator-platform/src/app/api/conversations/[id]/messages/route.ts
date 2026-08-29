import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  body: z.string().max(4000).default(""),
  mediaUrl: z.string().url().optional(),
  priceCents: z.number().int().min(0).max(50000).default(0),
});

async function assertParticipant(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { creator: true },
  });
  if (!conversation) return null;
  const isParticipant = conversation.fanId === userId || conversation.creator.userId === userId;
  return isParticipant ? conversation : null;
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const conversation = await assertParticipant(params.id, session.user.id);
  if (!conversation) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  // Modération automatique des messages (contenu illégal, spam, tentative de paiement hors
  // plateforme) — section 3.5. Ici : détection best-effort de coordonnées/liens externes.
  const suspiciousPattern = /(paypal|venmo|whatsapp|@gmail\.com|@hotmail\.com|\+\d{9,})/i;
  if (suspiciousPattern.test(parsed.data.body)) {
    return NextResponse.json(
      { error: "Message bloqué : tentative de paiement ou d'échange de contact hors plateforme détectée." },
      { status: 422 }
    );
  }

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: session.user.id,
      body: parsed.data.body,
      mediaUrl: parsed.data.mediaUrl,
      priceCents: parsed.data.priceCents,
    },
  });

  return NextResponse.json({ id: message.id });
}
