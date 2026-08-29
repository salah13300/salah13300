import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import SubscribeButton from "@/components/SubscribeButton";
import ContentCard from "@/components/ContentCard";
import ReportButton from "@/components/ReportButton";
import TipButton from "@/components/TipButton";
import StartConversationButton from "@/components/StartConversationButton";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { handle: string } }) {
  const creator = await prisma.creatorProfile.findUnique({ where: { handle: params.handle } });
  if (!creator) return {};
  return {
    title: `${creator.displayName} (@${creator.handle}) — VelvetClub`,
    description: creator.bio.slice(0, 160),
  };
}

export default async function CreatorProfilePage({ params }: { params: { handle: string } }) {
  const session = await getSession();

  const creator = await prisma.creatorProfile.findUnique({
    where: { handle: params.handle },
    include: {
      contents: { orderBy: { createdAt: "desc" } },
      _count: { select: { subscribers: true } },
    },
  });

  if (!creator || creator.status !== "APPROVED") notFound();

  const isFan = session?.user.role === "FAN";
  const subscription = isFan
    ? await prisma.subscription.findUnique({
        where: { fanId_creatorId: { fanId: session!.user.id, creatorId: creator.id } },
      })
    : null;
  const isSubscribed = !!subscription?.active;

  const unlockedIds = isFan
    ? new Set(
        (
          await prisma.contentUnlock.findMany({
            where: { userId: session!.user.id, content: { creatorId: creator.id } },
            select: { contentId: true },
          })
        ).map((u) => u.contentId)
      )
    : new Set<string>();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{creator.displayName}</h1>
          <p className="text-white/50">
            @{creator.handle} · {creator._count.subscribers} abonnés
          </p>
          <p className="mt-3 max-w-xl text-white/70">{creator.bio}</p>
        </div>
        <div className="flex flex-col items-start gap-2">
          {isSubscribed ? (
            <span className="rounded-full bg-green-600/20 px-4 py-2 text-sm font-medium text-green-400">
              ✓ Abonné jusqu&apos;au {subscription!.renewsAt.toLocaleDateString("fr-FR")}
            </span>
          ) : (
            <SubscribeButton
              creatorId={creator.id}
              priceCents={creator.subscriptionPriceCents}
              isAuthenticated={!!session}
            />
          )}
          {isFan && <StartConversationButton creatorId={creator.id} />}
          {isFan && <TipButton creatorId={creator.id} />}
          <ReportButton targetType="creatorProfile" targetId={creator.id} />
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold">Contenus</h2>
      {creator.contents.length === 0 ? (
        <p className="text-white/50">Aucun contenu publié pour le moment.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {creator.contents.map((content) => (
            <ContentCard
              key={content.id}
              id={content.id}
              title={content.title}
              mediaUrl={content.mediaUrl}
              thumbnailUrl={content.thumbnailUrl}
              visibility={content.visibility}
              priceCents={content.priceCents}
              isSubscribed={isSubscribed}
              isUnlocked={unlockedIds.has(content.id)}
              isAuthenticated={!!session}
            />
          ))}
        </div>
      )}
    </div>
  );
}
