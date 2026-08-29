import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function MessagesListPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const conversations =
    session.user.role === "CREATOR"
      ? await prisma.conversation.findMany({
          where: { creator: { userId: session.user.id } },
          include: { fan: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.conversation.findMany({
          where: { fanId: session.user.id },
          include: { creator: true, messages: { orderBy: { createdAt: "desc" }, take: 1 } },
          orderBy: { createdAt: "desc" },
        });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Messages</h1>
      {conversations.length === 0 ? (
        <p className="text-white/50">Aucune conversation pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {conversations.map((c: any) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="block rounded-xl border border-white/10 bg-ink-800 p-4 hover:border-brand-500"
            >
              <p className="font-medium">
                {session.user.role === "CREATOR" ? c.fan.email : c.creator.displayName}
              </p>
              <p className="truncate text-sm text-white/50">
                {c.messages[0]?.body || "Nouvelle conversation"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
