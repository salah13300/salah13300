import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreatorProfileDecision, ReportDecision } from "@/components/ModerationDecisionButtons";

export default async function ModerationQueuePage() {
  const session = await getSession();
  if (!session || (session.user.role !== "MODERATOR" && session.user.role !== "ADMIN")) {
    redirect("/");
  }

  const pendingProfiles = await prisma.creatorProfile.findMany({
    where: { status: "PENDING_REVIEW" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  const openReports = await prisma.report.findMany({
    where: { status: "OPEN" },
    include: { reporter: true },
    orderBy: { createdAt: "asc" },
  });

  const recentLogs = await prisma.moderationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { moderator: true },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">File de modération</h1>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Profils créateurs en attente ({pendingProfiles.length})</h2>
        <div className="space-y-3">
          {pendingProfiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-800 p-4">
              <div>
                <p className="font-medium">{p.displayName} (@{p.handle})</p>
                <p className="text-xs text-white/50">
                  {p.user.email} · KYC : {p.user.kycStatus} · contrat signé le{" "}
                  {p.contractSignedAt?.toLocaleDateString("fr-FR") ?? "—"}
                </p>
                <p className="mt-1 max-w-xl text-sm text-white/60">{p.bio}</p>
              </div>
              <CreatorProfileDecision profileId={p.id} />
            </div>
          ))}
          {pendingProfiles.length === 0 && <p className="text-white/40">Aucun profil en attente.</p>}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-semibold">Signalements ouverts ({openReports.length})</h2>
        <div className="space-y-3">
          {openReports.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-ink-800 p-4">
              <div>
                <p className="font-medium">
                  {r.targetType} · {r.targetId}
                </p>
                <p className="text-xs text-white/50">Signalé par {r.reporter.email}</p>
                <p className="mt-1 text-sm text-white/60">{r.reason}</p>
              </div>
              <ReportDecision reportId={r.id} />
            </div>
          ))}
          {openReports.length === 0 && <p className="text-white/40">Aucun signalement ouvert.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Journal d&apos;audit (dernières actions)</h2>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-ink-800 text-white/50">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Modérateur</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Cible</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((l) => (
                <tr key={l.id} className="border-t border-white/5">
                  <td className="px-3 py-2">{l.createdAt.toLocaleString("fr-FR")}</td>
                  <td className="px-3 py-2">{l.moderator.email}</td>
                  <td className="px-3 py-2">{l.action}</td>
                  <td className="px-3 py-2">
                    {l.targetType}:{l.targetId}
                  </td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-white/40">
                    Aucune action enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
