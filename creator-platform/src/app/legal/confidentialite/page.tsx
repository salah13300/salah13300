export const metadata = { title: "Confidentialité (RGPD) — VelvetClub" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-white/80 leading-relaxed">
      <h1 className="text-2xl font-bold">Politique de confidentialité (RGPD)</h1>
      <p className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
        ⚠️ Document indicatif. À faire valider par un DPO/avocat avant lancement — voir section
        4.3 et 9 du cahier des charges.
      </p>
      <h2 className="mt-6 text-lg font-semibold">Données collectées</h2>
      <ul className="list-disc pl-5">
        <li>Données de compte (email, mot de passe haché)</li>
        <li>Données de vérification d&apos;identité (traitées et stockées par notre prestataire KYC tiers, jamais en interne)</li>
        <li>Données de paiement (tokenisées par le prestataire de paiement, jamais de carte en clair chez nous)</li>
        <li>Données d&apos;usage pseudonymisées à des fins analytiques</li>
      </ul>
      <h2 className="mt-6 text-lg font-semibold">Vos droits</h2>
      <p>
        Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification et
        d&apos;effacement de vos données. Contactez notre support pour toute demande.
      </p>
      <h2 className="mt-6 text-lg font-semibold">Sécurité</h2>
      <p>
        Chiffrement en transit (TLS) et au repos, accès aux documents d&apos;identité restreint et
        audité, notification à la CNIL sous 72h en cas de fuite de données.
      </p>
    </div>
  );
}
