import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ConversationThread from "@/components/ConversationThread";

export default async function ConversationPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      fan: true,
      creator: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) notFound();

  const isFan = conversation.fanId === session.user.id;
  const isCreator = conversation.creator.userId === session.user.id;
  if (!isFan && !isCreator) notFound();

  const messages = conversation.messages.map((m) => ({
    id: m.id,
    senderId: m.senderId,
    body: m.body,
    mediaUrl: m.mediaUrl,
    priceCents: m.priceCents,
    unlocked: (JSON.parse(m.unlockedBy) as string[]).includes(session.user.id) || m.senderId === session.user.id,
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-xl font-bold">
        Conversation avec {isFan ? conversation.creator.displayName : conversation.fan.email}
      </h1>
      <ConversationThread
        conversationId={conversation.id}
        messages={messages}
        currentUserId={session.user.id}
        canSendMedia={isCreator}
      />
    </div>
  );
}
