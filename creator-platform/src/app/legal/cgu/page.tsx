export const metadata = { title: "CGU / CGV — VelvetClub" };

export default function CguPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-white/80 leading-relaxed">
      <h1 className="text-2xl font-bold">Conditions Générales d&apos;Utilisation et de Vente</h1>
      <p className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
        ⚠️ Document indicatif de démonstration. Le cahier des charges du projet (section 9) impose
        de faire rédiger les CGU/CGV définitives par un avocat spécialisé en droit du numérique et
        du contenu adulte avant tout lancement commercial. Ne pas utiliser ce texte en production.
      </p>
      <h2 className="mt-6 text-lg font-semibold">1. Objet</h2>
      <p>
        La plateforme met en relation des créateurs de contenu majeurs et vérifiés avec des
        abonnés majeurs et vérifiés, pour la diffusion de contenu exclusif contre abonnement ou
        paiement à l&apos;acte.
      </p>
      <h2 className="mt-6 text-lg font-semibold">2. Accès réservé aux majeurs</h2>
      <p>
        L&apos;inscription et l&apos;accès au contenu sont strictement réservés aux personnes
        majeures, après vérification d&apos;identité par un prestataire tiers.
      </p>
      <h2 className="mt-6 text-lg font-semibold">3. Obligations des créateurs</h2>
      <p>
        Chaque créateur certifie être l&apos;unique titulaire des droits sur le contenu déposé,
        consent explicitement à sa publication et s&apos;engage à respecter la politique de
        modération de la plateforme.
      </p>
      <h2 className="mt-6 text-lg font-semibold">4. Paiement et reversements</h2>
      <p>
        Les paiements transitent par un prestataire spécialisé. Les reversements aux créateurs
        sont soumis à une période de rétention anti-fraude.
      </p>
      <h2 className="mt-6 text-lg font-semibold">5. Interdiction de paiement hors plateforme</h2>
      <p>
        Toute tentative de solliciter ou d&apos;effectuer un paiement en dehors de la plateforme
        est strictement interdite et peut entraîner la suspension du compte.
      </p>
    </div>
  );
}
