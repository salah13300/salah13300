/**
 * Calcule le montant total d'un plan
 */
export function calculerMontantPlan(plan, config) {
  if (plan.type === 'HA') {
    return plan.poidsKg * config.prixAcierKg;
  } else if (plan.type === 'TS') {
    return plan.surfaceM2 * config.prixTSM2;
  }
  return 0;
}

/**
 * Calcule le coût d'achat d'un plan
 */
export function calculerCoutPlan(plan, config) {
  if (plan.type === 'HA') {
    return plan.poidsKg * config.prixAchatKg;
  } else if (plan.type === 'TS') {
    return plan.surfaceM2 * config.prixAchatTSM2;
  }
  return 0;
}

/**
 * Calcule l'avancement total d'un plan jusqu'à un mois donné
 */
export function calculerAvancementCumule(plan, moisFin) {
  if (!plan.avancements) return 0;

  const moisTries = Object.keys(plan.avancements).sort();
  let cumul = 0;

  for (const mois of moisTries) {
    if (mois <= moisFin) {
      cumul = plan.avancements[mois]; // C'est cumulatif, donc on prend la dernière valeur
    }
  }

  return Math.min(100, cumul);
}

/**
 * Calcule l'avancement du mois uniquement
 */
export function calculerAvancementMois(plan, mois) {
  if (!plan.avancements || !plan.avancements[mois]) return 0;

  const moisTries = Object.keys(plan.avancements).sort();
  const indexMois = moisTries.indexOf(mois);

  if (indexMois === 0) {
    return plan.avancements[mois];
  }

  const moisPrecedent = moisTries[indexMois - 1];
  return plan.avancements[mois] - (plan.avancements[moisPrecedent] || 0);
}

/**
 * Calcule la situation mensuelle complète
 */
export function calculerSituation(plans, mois, config) {
  const moisPrecedent = getMoisPrecedent(mois);

  const situation = {
    mois,
    details: [],
    totaux: {
      ha: { cumulAnt: 0, mois: 0, cumulNouveau: 0 },
      ts: { cumulAnt: 0, mois: 0, cumulNouveau: 0 },
      total: { cumulAnt: 0, mois: 0, cumulNouveau: 0 }
    },
    couts: {
      ha: { cumulAnt: 0, mois: 0, cumulNouveau: 0 },
      ts: { cumulAnt: 0, mois: 0, cumulNouveau: 0 },
      total: { cumulAnt: 0, mois: 0, cumulNouveau: 0 }
    },
    resultat: {
      cumulAnt: 0,
      mois: 0,
      cumulNouveau: 0
    }
  };

  for (const plan of plans) {
    const montantTotal = calculerMontantPlan(plan, config);
    const coutTotal = calculerCoutPlan(plan, config);

    const avancementCumulAnt = calculerAvancementCumule(plan, moisPrecedent);
    const avancementCumulNouveau = calculerAvancementCumule(plan, mois);
    const avancementMois = avancementCumulNouveau - avancementCumulAnt;

    const montantCumulAnt = montantTotal * avancementCumulAnt / 100;
    const montantMois = montantTotal * avancementMois / 100;
    const montantCumulNouveau = montantTotal * avancementCumulNouveau / 100;

    const coutCumulAnt = coutTotal * avancementCumulAnt / 100;
    const coutMois = coutTotal * avancementMois / 100;
    const coutCumulNouveau = coutTotal * avancementCumulNouveau / 100;

    situation.details.push({
      plan,
      montantTotal,
      coutTotal,
      avancementCumulAnt,
      avancementMois,
      avancementCumulNouveau,
      montantCumulAnt,
      montantMois,
      montantCumulNouveau,
      coutCumulAnt,
      coutMois,
      coutCumulNouveau,
      margeCumulAnt: montantCumulAnt - coutCumulAnt,
      margeMois: montantMois - coutMois,
      margeCumulNouveau: montantCumulNouveau - coutCumulNouveau
    });

    // Totaux par type
    const typeKey = plan.type.toLowerCase();
    if (situation.totaux[typeKey]) {
      situation.totaux[typeKey].cumulAnt += montantCumulAnt;
      situation.totaux[typeKey].mois += montantMois;
      situation.totaux[typeKey].cumulNouveau += montantCumulNouveau;

      situation.couts[typeKey].cumulAnt += coutCumulAnt;
      situation.couts[typeKey].mois += coutMois;
      situation.couts[typeKey].cumulNouveau += coutCumulNouveau;
    }

    // Totaux généraux
    situation.totaux.total.cumulAnt += montantCumulAnt;
    situation.totaux.total.mois += montantMois;
    situation.totaux.total.cumulNouveau += montantCumulNouveau;

    situation.couts.total.cumulAnt += coutCumulAnt;
    situation.couts.total.mois += coutMois;
    situation.couts.total.cumulNouveau += coutCumulNouveau;
  }

  // Calcul du résultat (marge)
  situation.resultat.cumulAnt = situation.totaux.total.cumulAnt - situation.couts.total.cumulAnt;
  situation.resultat.mois = situation.totaux.total.mois - situation.couts.total.mois;
  situation.resultat.cumulNouveau = situation.totaux.total.cumulNouveau - situation.couts.total.cumulNouveau;

  return situation;
}

/**
 * Retourne le mois précédent au format YYYY-MM
 */
export function getMoisPrecedent(mois) {
  const [year, month] = mois.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Retourne le mois suivant au format YYYY-MM
 */
export function getMoisSuivant(mois) {
  const [year, month] = mois.split('-').map(Number);
  const date = new Date(year, month, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Formate un nombre en euros
 */
export function formatEuros(montant) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(montant);
}

/**
 * Formate un nombre
 */
export function formatNumber(number, decimals = 2) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
}

/**
 * Génère la liste des mois disponibles à partir des plans
 */
export function getMoisDisponibles(plans) {
  const moisSet = new Set();

  plans.forEach(plan => {
    if (plan.moisImport) moisSet.add(plan.moisImport);
    if (plan.dateLivraison) moisSet.add(plan.dateLivraison.slice(0, 7));
    if (plan.avancements) {
      Object.keys(plan.avancements).forEach(m => moisSet.add(m));
    }
  });

  // Ajouter le mois courant
  moisSet.add(new Date().toISOString().slice(0, 7));

  return Array.from(moisSet).sort();
}

/**
 * Calcule l'historique des résultats par mois
 */
export function calculerHistoriqueResultats(plans, config) {
  const mois = getMoisDisponibles(plans);
  const historique = [];

  for (const m of mois) {
    const situation = calculerSituation(plans, m, config);
    historique.push({
      mois: m,
      chiffreAffaires: situation.totaux.total.mois,
      couts: situation.couts.total.mois,
      marge: situation.resultat.mois,
      margePercent: situation.totaux.total.mois > 0
        ? (situation.resultat.mois / situation.totaux.total.mois) * 100
        : 0
    });
  }

  return historique;
}
