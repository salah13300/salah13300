/**
 * Récupère le prix pour un client et un type donné
 */
export function getPrixClient(codeClient, type, clients, config) {
  const clientPrix = clients[codeClient];
  if (clientPrix) {
    if (type === 'ASS') return clientPrix.prixASS || config.prixASSDefaut;
    if (type === 'CF') return clientPrix.prixCF || config.prixCFDefaut;
    if (type === 'TS') return clientPrix.prixTS || config.prixTSDefaut;
  }
  // Prix par défaut
  if (type === 'ASS') return config.prixASSDefaut;
  if (type === 'CF') return config.prixCFDefaut;
  if (type === 'TS') return config.prixTSDefaut;
  return 0;
}

/**
 * Calcule les montants d'un plan (ASS + CF séparément)
 */
export function calculerMontantsPlan(plan, clients, config) {
  const prixASS = getPrixClient(plan.codeClient, 'ASS', clients, config);
  const prixCF = getPrixClient(plan.codeClient, 'CF', clients, config);
  const prixTS = getPrixClient(plan.codeClient, 'TS', clients, config);

  return {
    montantASS: (plan.poidsASSCommande || 0) * prixASS,
    montantCF: (plan.poidsCFCommande || 0) * prixCF,
    montantTS: (plan.surfaceTS || 0) * prixTS,
    montantTotal: ((plan.poidsASSCommande || 0) * prixASS) +
                  ((plan.poidsCFCommande || 0) * prixCF) +
                  ((plan.surfaceTS || 0) * prixTS),
    // Coûts
    coutASS: (plan.poidsASSCommande || 0) * config.coutASS,
    coutCF: (plan.poidsCFCommande || 0) * config.coutCF,
    coutTS: (plan.surfaceTS || 0) * config.coutTS,
    coutTotal: ((plan.poidsASSCommande || 0) * config.coutASS) +
               ((plan.poidsCFCommande || 0) * config.coutCF) +
               ((plan.surfaceTS || 0) * config.coutTS)
  };
}

/**
 * Calcule l'avancement cumulé jusqu'à un mois donné
 */
export function calculerAvancementCumule(plan, moisFin) {
  if (!plan.avancements) return 0;

  const moisTries = Object.keys(plan.avancements).sort();
  let cumul = 0;

  for (const mois of moisTries) {
    if (mois <= moisFin) {
      cumul = plan.avancements[mois];
    }
  }

  return Math.min(100, cumul);
}

/**
 * Calcule la situation mensuelle pour un client donné
 */
export function calculerSituationClient(plans, codeClient, mois, clients, config) {
  const moisPrecedent = getMoisPrecedent(mois);

  // Filtrer les plans du client
  const plansClient = plans.filter(p => p.codeClient === codeClient);

  const situation = {
    mois,
    codeClient,
    nomClient: clients[codeClient]?.nom || codeClient,
    details: [],
    totaux: {
      ass: { nouveauCumul: 0, ancienCumul: 0, mois: 0 },
      cf: { nouveauCumul: 0, ancienCumul: 0, mois: 0 },
      ts: { nouveauCumul: 0, ancienCumul: 0, mois: 0 },
      total: { nouveauCumul: 0, ancienCumul: 0, mois: 0 }
    },
    quantites: {
      ass: { nouveauCumul: 0, ancienCumul: 0, mois: 0 },
      cf: { nouveauCumul: 0, ancienCumul: 0, mois: 0 },
      ts: { nouveauCumul: 0, ancienCumul: 0, mois: 0 }
    }
  };

  for (const plan of plansClient) {
    const montants = calculerMontantsPlan(plan, clients, config);

    const avancementAncien = calculerAvancementCumule(plan, moisPrecedent);
    const avancementNouveau = calculerAvancementCumule(plan, mois);
    const avancementMois = avancementNouveau - avancementAncien;

    const detail = {
      plan,
      avancementAncien,
      avancementMois,
      avancementNouveau,
      // ASS
      poidsASSAncien: (plan.poidsASSCommande || 0) * avancementAncien / 100,
      poidsASSMois: (plan.poidsASSCommande || 0) * avancementMois / 100,
      poidsASSNouveau: (plan.poidsASSCommande || 0) * avancementNouveau / 100,
      montantASSAncien: montants.montantASS * avancementAncien / 100,
      montantASSMois: montants.montantASS * avancementMois / 100,
      montantASSNouveau: montants.montantASS * avancementNouveau / 100,
      // CF
      poidsCFAncien: (plan.poidsCFCommande || 0) * avancementAncien / 100,
      poidsCFMois: (plan.poidsCFCommande || 0) * avancementMois / 100,
      poidsCFNouveau: (plan.poidsCFCommande || 0) * avancementNouveau / 100,
      montantCFAncien: montants.montantCF * avancementAncien / 100,
      montantCFMois: montants.montantCF * avancementMois / 100,
      montantCFNouveau: montants.montantCF * avancementNouveau / 100,
      // Total
      montantTotalAncien: montants.montantTotal * avancementAncien / 100,
      montantTotalMois: montants.montantTotal * avancementMois / 100,
      montantTotalNouveau: montants.montantTotal * avancementNouveau / 100,
    };

    situation.details.push(detail);

    // Totaux ASS
    situation.totaux.ass.ancienCumul += detail.montantASSAncien;
    situation.totaux.ass.mois += detail.montantASSMois;
    situation.totaux.ass.nouveauCumul += detail.montantASSNouveau;
    situation.quantites.ass.ancienCumul += detail.poidsASSAncien;
    situation.quantites.ass.mois += detail.poidsASSMois;
    situation.quantites.ass.nouveauCumul += detail.poidsASSNouveau;

    // Totaux CF
    situation.totaux.cf.ancienCumul += detail.montantCFAncien;
    situation.totaux.cf.mois += detail.montantCFMois;
    situation.totaux.cf.nouveauCumul += detail.montantCFNouveau;
    situation.quantites.cf.ancienCumul += detail.poidsCFAncien;
    situation.quantites.cf.mois += detail.poidsCFMois;
    situation.quantites.cf.nouveauCumul += detail.poidsCFNouveau;

    // Total général
    situation.totaux.total.ancienCumul += detail.montantTotalAncien;
    situation.totaux.total.mois += detail.montantTotalMois;
    situation.totaux.total.nouveauCumul += detail.montantTotalNouveau;
  }

  // Calcul HT et TTC
  situation.totalHT = {
    nouveauCumul: situation.totaux.total.nouveauCumul,
    ancienCumul: situation.totaux.total.ancienCumul,
    mois: situation.totaux.total.mois
  };

  const tauxTVA = config.tva / 100;
  situation.tva = {
    nouveauCumul: situation.totalHT.nouveauCumul * tauxTVA,
    ancienCumul: situation.totalHT.ancienCumul * tauxTVA,
    mois: situation.totalHT.mois * tauxTVA
  };

  situation.totalTTC = {
    nouveauCumul: situation.totalHT.nouveauCumul * (1 + tauxTVA),
    ancienCumul: situation.totalHT.ancienCumul * (1 + tauxTVA),
    mois: situation.totalHT.mois * (1 + tauxTVA)
  };

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
 * Génère la liste des mois disponibles
 */
export function getMoisDisponibles(plans) {
  const moisSet = new Set();

  plans.forEach(plan => {
    if (plan.moisImport) moisSet.add(plan.moisImport);
    if (plan.datePrevue) moisSet.add(plan.datePrevue.slice(0, 7));
    if (plan.avancements) {
      Object.keys(plan.avancements).forEach(m => moisSet.add(m));
    }
  });

  moisSet.add(new Date().toISOString().slice(0, 7));

  return Array.from(moisSet).sort();
}

/**
 * Retourne la liste des clients uniques
 */
export function getClientsUniques(plans) {
  const clientsMap = new Map();

  plans.forEach(plan => {
    if (plan.codeClient && !clientsMap.has(plan.codeClient)) {
      clientsMap.set(plan.codeClient, {
        code: plan.codeClient,
        nom: plan.nomClient
      });
    }
  });

  return Array.from(clientsMap.values());
}

/**
 * Retourne la liste des chantiers pour un client donné
 */
export function getChantiersParClient(plans, codeClient) {
  const chantiersMap = new Map();

  plans.filter(p => p.codeClient === codeClient).forEach(plan => {
    if (plan.codeChantier && !chantiersMap.has(plan.codeChantier)) {
      chantiersMap.set(plan.codeChantier, {
        code: plan.codeChantier,
        nom: plan.nomChantier
      });
    }
  });

  return Array.from(chantiersMap.values());
}

/**
 * Calcule la situation mensuelle pour un chantier spécifique
 */
export function calculerSituationChantier(plans, codeChantier, mois, clients, config, articlesManuals = []) {
  const moisPrecedent = getMoisPrecedent(mois);

  // Filtrer les plans du chantier
  const plansChantier = plans.filter(p => p.codeChantier === codeChantier);
  const codeClient = plansChantier.length > 0 ? plansChantier[0].codeClient : null;

  // Articles manuels pour ce chantier et ce mois
  const articlesManuelsFiltres = articlesManuals.filter(
    a => a.codeChantier === codeChantier && a.mois === mois
  );

  const situation = {
    mois,
    codeChantier,
    nomChantier: plansChantier.length > 0 ? plansChantier[0].nomChantier : codeChantier,
    codeClient,
    nomClient: clients[codeClient]?.nom || codeClient,
    details: [],
    articlesManuals: [],
    totaux: {
      ass: { nouveauCumul: 0, ancienCumul: 0, mois: 0 },
      cf: { nouveauCumul: 0, ancienCumul: 0, mois: 0 },
      ts: { nouveauCumul: 0, ancienCumul: 0, mois: 0 },
      total: { nouveauCumul: 0, ancienCumul: 0, mois: 0 }
    },
    quantites: {
      ass: { nouveauCumul: 0, ancienCumul: 0, mois: 0 },
      cf: { nouveauCumul: 0, ancienCumul: 0, mois: 0 },
      ts: { nouveauCumul: 0, ancienCumul: 0, mois: 0 }
    }
  };

  for (const plan of plansChantier) {
    const montants = calculerMontantsPlan(plan, clients, config);

    const avancementAncien = calculerAvancementCumule(plan, moisPrecedent);
    const avancementNouveau = calculerAvancementCumule(plan, mois);
    const avancementMois = avancementNouveau - avancementAncien;

    const detail = {
      plan,
      avancementAncien,
      avancementMois,
      avancementNouveau,
      // ASS
      poidsASSAncien: (plan.poidsASSCommande || 0) * avancementAncien / 100,
      poidsASSMois: (plan.poidsASSCommande || 0) * avancementMois / 100,
      poidsASSNouveau: (plan.poidsASSCommande || 0) * avancementNouveau / 100,
      montantASSAncien: montants.montantASS * avancementAncien / 100,
      montantASSMois: montants.montantASS * avancementMois / 100,
      montantASSNouveau: montants.montantASS * avancementNouveau / 100,
      // CF
      poidsCFAncien: (plan.poidsCFCommande || 0) * avancementAncien / 100,
      poidsCFMois: (plan.poidsCFCommande || 0) * avancementMois / 100,
      poidsCFNouveau: (plan.poidsCFCommande || 0) * avancementNouveau / 100,
      montantCFAncien: montants.montantCF * avancementAncien / 100,
      montantCFMois: montants.montantCF * avancementMois / 100,
      montantCFNouveau: montants.montantCF * avancementNouveau / 100,
      // Total
      montantTotalAncien: montants.montantTotal * avancementAncien / 100,
      montantTotalMois: montants.montantTotal * avancementMois / 100,
      montantTotalNouveau: montants.montantTotal * avancementNouveau / 100,
    };

    situation.details.push(detail);

    // Totaux ASS
    situation.totaux.ass.ancienCumul += detail.montantASSAncien;
    situation.totaux.ass.mois += detail.montantASSMois;
    situation.totaux.ass.nouveauCumul += detail.montantASSNouveau;
    situation.quantites.ass.ancienCumul += detail.poidsASSAncien;
    situation.quantites.ass.mois += detail.poidsASSMois;
    situation.quantites.ass.nouveauCumul += detail.poidsASSNouveau;

    // Totaux CF
    situation.totaux.cf.ancienCumul += detail.montantCFAncien;
    situation.totaux.cf.mois += detail.montantCFMois;
    situation.totaux.cf.nouveauCumul += detail.montantCFNouveau;
    situation.quantites.cf.ancienCumul += detail.poidsCFAncien;
    situation.quantites.cf.mois += detail.poidsCFMois;
    situation.quantites.cf.nouveauCumul += detail.poidsCFNouveau;

    // Total général
    situation.totaux.total.ancienCumul += detail.montantTotalAncien;
    situation.totaux.total.mois += detail.montantTotalMois;
    situation.totaux.total.nouveauCumul += detail.montantTotalNouveau;
  }

  // Ajouter les articles manuels
  for (const article of articlesManuelsFiltres) {
    situation.articlesManuals.push(article);
    situation.totaux.total.mois += article.montant || 0;
    situation.totaux.total.nouveauCumul += article.montant || 0;
  }

  // Calcul HT et TTC
  situation.totalHT = {
    nouveauCumul: situation.totaux.total.nouveauCumul,
    ancienCumul: situation.totaux.total.ancienCumul,
    mois: situation.totaux.total.mois
  };

  const tauxTVA = config.tva / 100;
  situation.tva = {
    nouveauCumul: situation.totalHT.nouveauCumul * tauxTVA,
    ancienCumul: situation.totalHT.ancienCumul * tauxTVA,
    mois: situation.totalHT.mois * tauxTVA
  };

  situation.totalTTC = {
    nouveauCumul: situation.totalHT.nouveauCumul * (1 + tauxTVA),
    ancienCumul: situation.totalHT.ancienCumul * (1 + tauxTVA),
    mois: situation.totalHT.mois * (1 + tauxTVA)
  };

  return situation;
}

/**
 * Retourne tous les chantiers avec leurs infos
 */
export function getAllChantiers(plans) {
  const chantiersMap = new Map();

  plans.forEach(plan => {
    if (plan.codeChantier && !chantiersMap.has(plan.codeChantier)) {
      chantiersMap.set(plan.codeChantier, {
        code: plan.codeChantier,
        nom: plan.nomChantier,
        codeClient: plan.codeClient,
        nomClient: plan.nomClient
      });
    }
  });

  return Array.from(chantiersMap.values());
}

/**
 * Calcule les statistiques globales
 */
export function calculerStatistiquesGlobales(plans, clients, config) {
  let totalPoidsASS = 0;
  let totalPoidsCF = 0;
  let totalSurfaceTS = 0;
  let totalMontant = 0;

  plans.forEach(plan => {
    totalPoidsASS += plan.poidsASSCommande || 0;
    totalPoidsCF += plan.poidsCFCommande || 0;
    totalSurfaceTS += plan.surfaceTS || 0;

    const montants = calculerMontantsPlan(plan, clients, config);
    totalMontant += montants.montantTotal;
  });

  return {
    nbPlans: plans.length,
    nbClients: Object.keys(clients).length,
    totalPoidsASS,
    totalPoidsCF,
    totalPoidsHA: totalPoidsASS + totalPoidsCF,
    totalSurfaceTS,
    totalMontant
  };
}
