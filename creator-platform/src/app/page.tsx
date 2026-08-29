import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getFeaturedCreators() {
  return prisma.creatorProfile.findMany({
    where: { status: "APPROVED" },
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      contents: { where: { visibility: "PUBLIC_TEASER" }, take: 1 },
      _count: { select: { subscribers: true } },
    },
  });
}

export default async function HomePage() {
  const creators = await getFeaturedCreators();

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <p className="mb-4 inline-block rounded-full border border-brand-500/40 bg-brand-500/10 px-4 py-1 text-xs font-medium text-brand-300">
          🔞 Plateforme réservée aux adultes vérifiés
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
          Le lien direct avec vos créateurs et créatrices préférés
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-white/70">
          Contenu exclusif, messagerie privée, paiement sécurisé et discret. Chaque profil est
          vérifié par un contrôle d&apos;identité strict avant sa mise en ligne.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-brand-600 px-8 py-3 font-semibold hover:bg-brand-500"
          >
            Je suis fan
          </Link>
          <Link
            href="/register?role=CREATOR"
            className="rounded-full border border-white/20 px-8 py-3 font-semibold hover:bg-white/5"
          >
            Je suis créateur·rice
          </Link>
        </div>

        <div className="mx-auto mt-14 grid max-w-3xl grid-cols-2 gap-6 text-sm text-white/60 sm:grid-cols-4">
          <div>
            <p className="text-2xl font-bold text-white">100%</p>
            Créateurs vérifiés (KYC)
          </div>
          <div>
            <p className="text-2xl font-bold text-white">24/7</p>
            Support & modération
          </div>
          <div>
            <p className="text-2xl font-bold text-white">🔒</p>
            Paiement sécurisé & discret
          </div>
          <div>
            <p className="text-2xl font-bold text-white">🛡️</p>
            Charte anti-arnaque
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="mb-6 text-xl font-bold">Créateurs à la une</h2>
        {creators.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-ink-800 p-8 text-center text-white/50">
            Aucun profil créateur approuvé pour le moment — lancez le seed de démo (voir README)
            ou créez un compte créateur et faites-le approuver depuis l&apos;espace modération.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {creators.map((creator) => (
              <Link
                key={creator.id}
                href={`/creators/${creator.handle}`}
                className="group overflow-hidden rounded-xl border border-white/10 bg-ink-800"
              >
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-ink-700">
                  {creator.contents[0] ? (
                    <img
                      src={creator.contents[0].thumbnailUrl ?? creator.contents[0].mediaUrl}
                      alt=""
                      className="teaser-blur h-full w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl">✨</div>
                  )}
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 to-transparent p-3">
                    <div>
                      <p className="font-semibold">{creator.displayName}</p>
                      <p className="text-xs text-white/60">
                        {creator._count.subscribers} abonnés · dès{" "}
                        {(creator.subscriptionPriceCents / 100).toFixed(2)}€/mois
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
