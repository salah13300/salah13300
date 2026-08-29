import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ContentUploadForm from "@/components/ContentUploadForm";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_REVIEW: "En attente de validation",
  APPROVED: "Approuvé — visible publiquement",
  REJECTED: "Rejeté",
  SUSPENDED: "Suspendu",
};

export default async function CreatorDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: session.user.id },
    include: { contents: { orderBy: { createdAt: "desc" } }, _count: { select: { subscribers: true } } },
  });

  if (!profile) redirect("/onboarding/creator");

  const revenue = await prisma.transaction.aggregate({
    where: { creatorId: profile.id, status: "COMPLETED" },
    _sum: { amountCents: true },
  });
  const revenueByType = await prisma.transaction.groupBy({
    by: ["type"],
    where: { creatorId: profile.id, status: "COMPLETED" },
    _sum: { amountCents: true },
  });

  const totalRevenue = revenue._sum.amountCents ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Studio de {profile.displayName}</h1>
          <p className="text-sm text-white/50">
            Statut du profil :{" "}
            <span className={profile.status === "APPROVED" ? "text-green-400" : "text-yellow-400"}>
              {STATUS_LABEL[profile.status]}
            </span>
          </p>
        </div>
        <Link href={`/creators/${profile.handle}`} className="text-sm text-brand-400 hover:underline">
          Voir mon profil public →
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Revenus totaux" value={`${(totalRevenue / 100).toFixed(2)}€`} />
        <StatCard label="Abonnés actifs" value={String(profile._count.subscribers)} />
        <StatCard label="Contenus publiés" value={String(profile.contents.length)} />
        <StatCard
          label="Prix abonnement"
          value={`${(profile.subscriptionPriceCents / 100).toFixed(2)}€/mois`}
        />
      </div>

      <div className="mb-8 rounded-xl border border-white/10 bg-ink-800 p-4">
        <h3 className="mb-3 font-semibold">Détail des revenus</h3>
        <ul className="space-y-1 text-sm text-white/70">
          {revenueByType.length === 0 && <li>Aucune transaction pour le moment.</li>}
          {revenueByType.map((r) => (
            <li key={r.type} className="flex justify-between">
              <span>{r.type}</span>
              <span>{((r._sum.amountCents ?? 0) / 100).toFixed(2)}€</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-8">
        <ContentUploadForm />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Mes contenus</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {profile.contents.map((c) => (
          <div key={c.id} className="overflow-hidden rounded-xl border border-white/10 bg-ink-800">
            <img src={c.thumbnailUrl ?? c.mediaUrl} alt="" className="aspect-square w-full object-cover" />
            <div className="p-2 text-xs">
              <p className="font-medium">{c.title}</p>
              <p className="text-white/40">{c.visibility}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-800 p-4">
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
