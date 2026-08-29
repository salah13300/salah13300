import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-white/10 bg-ink-900 py-10 text-sm text-white/50">
      <div className="mx-auto max-w-6xl px-4">
        <p className="mb-4 max-w-3xl text-white/70">
          Site réservé aux personnes majeures (18+). Tous les créateurs et créatrices sont
          vérifiés par un contrôle d&apos;identité et de majorité avant toute publication.
          Paiement sécurisé, discrétion du libellé bancaire. Signalez tout contenu ou
          comportement suspect via le bouton de signalement présent sur chaque profil.
        </p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/legal/cgu" className="hover:text-white">CGU / CGV</Link>
          <Link href="/legal/confidentialite" className="hover:text-white">Confidentialité (RGPD)</Link>
          <Link href="/legal/moderation" className="hover:text-white">Politique de modération</Link>
          <Link href="/support" className="hover:text-white">Support 24/7</Link>
        </div>
        <p className="mt-6 text-xs text-white/30">
          © {new Date().getFullYear()} VelvetClub — Projet de démonstration (MVP). Certaines
          intégrations (KYC, paiement) sont simulées — voir le README.
        </p>
      </div>
    </footer>
  );
}
