export const metadata = { title: "Politique de modération — VelvetClub" };

export default function ModerationPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-white/80 leading-relaxed">
      <h1 className="text-2xl font-bold">Politique de modération et de signalement</h1>
      <p className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200">
        ⚠️ Document indicatif — la politique définitive doit être rédigée avec un conseil juridique
        et une équipe de modération opérationnelle (section 9/10 du cahier des charges).
      </p>
      <h2 className="mt-6 text-lg font-semibold">Contenu strictement interdit</h2>
      <ul className="list-disc pl-5">
        <li>Contenu impliquant des mineurs, sous quelque forme que ce soit</li>
        <li>Contenu non consenti ou obtenu par contrainte</li>
        <li>Contenu volé ou publié sans l&apos;accord de toutes les personnes qui y figurent</li>
        <li>Violence, incitation à la haine, contenu illégal</li>
      </ul>
      <h2 className="mt-6 text-lg font-semibold">Processus</h2>
      <p>
        Tout contenu déposé passe par une détection automatisée avant publication, complétée par
        une revue humaine. Les signalements utilisateurs sont traités en priorité. En cas de
        contenu illégal avéré, la plateforme coopère avec les autorités compétentes (signalement
        PHAROS en France).
      </p>
    </div>
  );
}
