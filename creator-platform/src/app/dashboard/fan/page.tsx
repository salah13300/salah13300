import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import WalletTopUp from "@/components/WalletTopUp";

export default async function FanDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const subscriptions = await prisma.subscription.findMany({
    where: { fanId: session.user.id, active: true },
    include: { creator: true },
  });
  const transactions = await prisma.transaction.findMany({
    where: { buyerId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Mon espace</h1>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-ink-800 p-6">
        <div>
          <p className="text-sm text-white/50">Solde du portefeuille</p>
          <p className="text-3xl font-bold">{(user.walletBalanceCents / 100).toFixed(2)}€</p>
        </div>
        <WalletTopUp />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Mes abonnements</h2>
      {subscriptions.length === 0 ? (
        <p className="mb-8 text-white/50">
          Aucun abonnement actif. <Link href="/creators" className="text-brand-400">Découvrir des créateurs →</Link>
        </p>
      ) : (
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          {subscriptions.map((s) => (
            <Link
              key={s.id}
              href={`/creators/${s.creator.handle}`}
              className="rounded-xl border border-white/10 bg-ink-800 p-4 hover:border-brand-500"
            >
              <p className="font-medium">{s.creator.displayName}</p>
              <p className="text-xs text-white/50">
                Renouvellement le {s.renewsAt.toLocaleDateString("fr-FR")} · {(s.priceCents / 100).toFixed(2)}€/mois
              </p>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Historique des transactions</h2>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-800 text-white/50">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Montant</th>
              <th className="px-4 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-white/5">
                <td className="px-4 py-2">{t.createdAt.toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-2">{t.type}</td>
                <td className="px-4 py-2">{(t.amountCents / 100).toFixed(2)}€</td>
                <td className="px-4 py-2">{t.status}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-white/40">
                  Aucune transaction pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
