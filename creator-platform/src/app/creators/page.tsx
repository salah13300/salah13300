import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const revalidate = 30;

export default async function CreatorsPage() {
  const creators = await prisma.creatorProfile.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { subscribers: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Découvrir des créateurs</h1>
      {creators.length === 0 && (
        <p className="text-white/50">Aucun créateur approuvé pour le moment.</p>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {creators.map((c) => (
          <Link
            key={c.id}
            href={`/creators/${c.handle}`}
            className="rounded-xl border border-white/10 bg-ink-800 p-4 hover:border-brand-500"
          >
            <p className="font-semibold">{c.displayName}</p>
            <p className="text-xs text-white/50">@{c.handle}</p>
            <p className="mt-2 text-sm text-brand-400">
              {(c.subscriptionPriceCents / 100).toFixed(2)}€/mois · {c._count.subscribers} abonnés
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
