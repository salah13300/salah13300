import { useState, useMemo, useRef } from 'react';
import { useChantier } from '../context/ChantierContext';
import {
  formatEuros,
  formatNumber,
  getMoisDisponibles,
  getClientsUniques,
  getChantiersParClient,
  calculerAvancementCumule,
  getMoisPrecedent
} from '../utils/calculations';
import { Calendar, FileDown, ChevronLeft, ChevronRight, Users, Building, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SituationMensuelle() {
  const { state, dispatch } = useChantier();
  const { plans, clients, prestations, articlesManuals, currentMonth, currentClient, currentChantier, config } = state;
  const printRef = useRef();

  const moisDisponibles = useMemo(() => getMoisDisponibles(plans), [plans]);
  const listeClients = useMemo(() => getClientsUniques(plans), [plans]);

  // Sélectionner le premier client par défaut
  const clientActif = currentClient || (listeClients.length > 0 ? listeClients[0].code : null);

  // Liste des chantiers du client actif
  const chantiersClient = useMemo(() => {
    if (!clientActif) return [];
    return getChantiersParClient(plans, clientActif);
  }, [plans, clientActif]);

  // Sélectionner le premier chantier par défaut
  const chantierActif = currentChantier || (chantiersClient.length > 0 ? chantiersClient[0].code : null);

  // Calcul de la situation groupée par code prestation
  const situationParPrestation = useMemo(() => {
    if (!chantierActif) return null;

    const moisPrecedent = getMoisPrecedent(currentMonth);

    // Filtrer les plans du chantier
    const plansChantier = plans.filter(p => p.codeChantier === chantierActif);

    // Grouper par prestation
    const prestationsData = {};

    // Initialiser les prestations standard
    Object.entries(prestations).forEach(([code, prestation]) => {
      prestationsData[code] = {
        code,
        designation: prestation.nom,
        unite: prestation.unite,
        prix: prestation.prixVente,
        cumulPrecedent: { qte: 0, montant: 0 },
        situationMois: { qte: 0, montant: 0 },
        situationCumulee: { qte: 0, montant: 0 }
      };
    });

    // Calculer les quantités pour HA (ASS) depuis les plans
    for (const plan of plansChantier) {
      const avancementAncien = calculerAvancementCumule(plan, moisPrecedent);
      const avancementNouveau = calculerAvancementCumule(plan, currentMonth);
      const avancementMois = avancementNouveau - avancementAncien;

      // HA (ASS + CF combinés)
      const poidsTotal = (plan.poidsASSCommande || 0) + (plan.poidsCFCommande || 0);
      const prixHA = prestations['HA']?.prixVente || config.prixASSDefaut;

      if (poidsTotal > 0) {
        const qteAncien = poidsTotal * avancementAncien / 100;
        const qteMois = poidsTotal * avancementMois / 100;
        const qteNouveau = poidsTotal * avancementNouveau / 100;

        prestationsData['HA'].cumulPrecedent.qte += qteAncien;
        prestationsData['HA'].cumulPrecedent.montant += qteAncien * prixHA;
        prestationsData['HA'].situationMois.qte += qteMois;
        prestationsData['HA'].situationMois.montant += qteMois * prixHA;
        prestationsData['HA'].situationCumulee.qte += qteNouveau;
        prestationsData['HA'].situationCumulee.montant += qteNouveau * prixHA;
      }

      // Treillis-Pose (si le plan contient du treillis)
      if (plan.surfaceTS && plan.surfaceTS > 0) {
        const prixTS = prestations['Treillis-Pose']?.prixVente || config.prixTSDefaut;
        const qteAncien = plan.surfaceTS * avancementAncien / 100;
        const qteMois = plan.surfaceTS * avancementMois / 100;
        const qteNouveau = plan.surfaceTS * avancementNouveau / 100;

        prestationsData['Treillis-Pose'].cumulPrecedent.qte += qteAncien;
        prestationsData['Treillis-Pose'].cumulPrecedent.montant += qteAncien * prixTS;
        prestationsData['Treillis-Pose'].situationMois.qte += qteMois;
        prestationsData['Treillis-Pose'].situationMois.montant += qteMois * prixTS;
        prestationsData['Treillis-Pose'].situationCumulee.qte += qteNouveau;
        prestationsData['Treillis-Pose'].situationCumulee.montant += qteNouveau * prixTS;
      }
    }

    // Ajouter les articles manuels pour ce chantier
    const articlesChantier = articlesManuals.filter(
      a => a.codeChantier === chantierActif
    );

    articlesChantier.forEach(article => {
      // Déterminer si c'est pour le mois en cours ou un mois précédent
      if (article.mois === currentMonth) {
        // Article du mois courant
        if (article.codePrestation && prestationsData[article.codePrestation]) {
          prestationsData[article.codePrestation].situationMois.qte += article.quantite || 0;
          prestationsData[article.codePrestation].situationMois.montant += article.montant || 0;
          prestationsData[article.codePrestation].situationCumulee.qte += article.quantite || 0;
          prestationsData[article.codePrestation].situationCumulee.montant += article.montant || 0;
        }
      } else if (article.mois < currentMonth) {
        // Article d'un mois précédent
        if (article.codePrestation && prestationsData[article.codePrestation]) {
          prestationsData[article.codePrestation].cumulPrecedent.qte += article.quantite || 0;
          prestationsData[article.codePrestation].cumulPrecedent.montant += article.montant || 0;
          prestationsData[article.codePrestation].situationCumulee.qte += article.quantite || 0;
          prestationsData[article.codePrestation].situationCumulee.montant += article.montant || 0;
        }
      }
    });

    // Filtrer uniquement les prestations avec des données
    const prestationsAvecDonnees = Object.values(prestationsData).filter(
      p => p.situationCumulee.qte > 0 || p.situationCumulee.montant > 0 || p.prix > 0
    );

    // Calculer les totaux
    const totaux = {
      cumulPrecedent: { montant: 0 },
      situationMois: { montant: 0 },
      situationCumulee: { montant: 0 }
    };

    prestationsAvecDonnees.forEach(p => {
      totaux.cumulPrecedent.montant += p.cumulPrecedent.montant;
      totaux.situationMois.montant += p.situationMois.montant;
      totaux.situationCumulee.montant += p.situationCumulee.montant;
    });

    // TVA
    const tauxTVA = config.tva / 100;
    const tva = {
      cumulPrecedent: totaux.cumulPrecedent.montant * tauxTVA,
      situationMois: totaux.situationMois.montant * tauxTVA,
      situationCumulee: totaux.situationCumulee.montant * tauxTVA
    };

    // TTC
    const ttc = {
      cumulPrecedent: totaux.cumulPrecedent.montant * (1 + tauxTVA),
      situationMois: totaux.situationMois.montant * (1 + tauxTVA),
      situationCumulee: totaux.situationCumulee.montant * (1 + tauxTVA)
    };

    // Infos chantier
    const chantierInfo = plansChantier.length > 0 ? {
      nomChantier: plansChantier[0].nomChantier,
      codeChantier: chantierActif,
      nomClient: plansChantier[0].nomClient || clients[clientActif]?.nom || clientActif,
      codeClient: clientActif
    } : { nomChantier: chantierActif, codeChantier: chantierActif, nomClient: clientActif, codeClient: clientActif };

    return {
      chantier: chantierInfo,
      prestations: prestationsAvecDonnees,
      totaux,
      tva,
      ttc,
      mois: currentMonth
    };
  }, [plans, chantierActif, currentMonth, prestations, articlesManuals, config, clients, clientActif]);

  const handleClientChange = (codeClient) => {
    dispatch({ type: 'SET_CURRENT_CLIENT', payload: codeClient });
    dispatch({ type: 'SET_CURRENT_CHANTIER', payload: null });
  };

  const handleChantierChange = (codeChantier) => {
    dispatch({ type: 'SET_CURRENT_CHANTIER', payload: codeChantier });
  };

  const handleMoisChange = (direction) => {
    const currentIndex = moisDisponibles.indexOf(currentMonth);
    let newIndex;

    if (direction === 'prev') {
      newIndex = Math.max(0, currentIndex - 1);
    } else {
      newIndex = Math.min(moisDisponibles.length - 1, currentIndex + 1);
    }

    if (moisDisponibles[newIndex]) {
      dispatch({ type: 'SET_CURRENT_MONTH', payload: moisDisponibles[newIndex] });
    }
  };

  const formatMois = (mois) => {
    const [year, month] = mois.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const exportToExcel = () => {
    if (!situationParPrestation) return;

    const data = situationParPrestation.prestations.map(p => ({
      'Désignation': p.designation,
      'Code': p.code,
      'Qté Cumul Préc.': p.cumulPrecedent.qte,
      'Montant Cumul Préc.': p.cumulPrecedent.montant,
      'Qté Mois': p.situationMois.qte,
      'Montant Mois': p.situationMois.montant,
      'Qté Cumulée': p.situationCumulee.qte,
      'Prix': p.prix,
      'Montant Cumulé': p.situationCumulee.montant,
    }));

    data.push({});
    data.push({
      'Désignation': 'MONTANT TOTAL HT',
      'Montant Cumul Préc.': situationParPrestation.totaux.cumulPrecedent.montant,
      'Montant Mois': situationParPrestation.totaux.situationMois.montant,
      'Montant Cumulé': situationParPrestation.totaux.situationCumulee.montant,
    });
    data.push({
      'Désignation': 'MONTANT TTC',
      'Montant Cumul Préc.': situationParPrestation.ttc.cumulPrecedent,
      'Montant Mois': situationParPrestation.ttc.situationMois,
      'Montant Cumulé': situationParPrestation.ttc.situationCumulee,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Situation');
    XLSX.writeFile(wb, `situation_${chantierActif}_${currentMonth}.xlsx`);
  };

  const exportToPDF = () => {
    if (!situationParPrestation) return;

    // Créer une nouvelle fenêtre pour l'impression/PDF
    const printWindow = window.open('', '_blank');
    const [year, month] = currentMonth.split('-');
    const moisFormate = new Date(year, month - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Situation de Travaux N° ${currentMonth}</title>
        <style>
          @page { size: A4 landscape; margin: 1cm; }
          body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; padding: 20px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .company-info { border: 1px solid #000; padding: 10px; width: 45%; }
          .client-info { border: 1px solid #000; padding: 10px; width: 45%; text-align: right; }
          .chantier-info { margin: 20px 0; }
          .chantier-info table { width: 50%; }
          .chantier-info td { padding: 3px 10px; }
          h2 { text-align: center; margin: 20px 0; color: #c00; }
          table.situation { width: 100%; border-collapse: collapse; margin-top: 20px; }
          table.situation th, table.situation td { border: 1px solid #000; padding: 5px; text-align: center; }
          table.situation th { background: #f0f0f0; font-weight: bold; }
          table.situation td.left { text-align: left; }
          table.situation td.right { text-align: right; }
          table.situation tr.total { background: #f0f0f0; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 9px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <strong>Votre Société</strong><br>
            Adresse de votre société<br>
            Code postal, Ville<br>
            SIRET: XXXXX
          </div>
          <div class="client-info">
            <strong>Coordonnées client:</strong><br>
            ${situationParPrestation.chantier.nomClient}
          </div>
        </div>

        <div class="chantier-info">
          <table>
            <tr><td><strong>Chantier:</strong></td><td>${situationParPrestation.chantier.nomChantier}</td></tr>
            <tr><td><strong>Marché de base:</strong></td><td></td></tr>
            <tr><td><strong>Total:</strong></td><td></td></tr>
          </table>
        </div>

        <h2>SITUATION DE TRAVAUX N° ${month} - ${moisFormate}</h2>

        <table class="situation">
          <thead>
            <tr>
              <th rowspan="2">Désignation</th>
              <th rowspan="2">Code</th>
              <th colspan="2">Cumul précédent</th>
              <th colspan="2">Situation du Mois</th>
              <th colspan="3">Situation cumulée</th>
            </tr>
            <tr>
              <th>Qté</th>
              <th>Montant</th>
              <th>Qté</th>
              <th>Montant</th>
              <th>Qté</th>
              <th>Prix</th>
              <th>Montant</th>
            </tr>
          </thead>
          <tbody>
            ${situationParPrestation.prestations.map(p => `
              <tr>
                <td class="left">${p.designation}</td>
                <td>${p.code}</td>
                <td class="right">${p.cumulPrecedent.qte > 0 ? formatNumber(p.cumulPrecedent.qte, 0) : ''}</td>
                <td class="right">${p.cumulPrecedent.montant > 0 ? formatEuros(p.cumulPrecedent.montant) : ''}</td>
                <td class="right">${p.situationMois.qte > 0 ? formatNumber(p.situationMois.qte, 0) : ''}</td>
                <td class="right">${p.situationMois.montant > 0 ? formatEuros(p.situationMois.montant) : ''}</td>
                <td class="right">${p.situationCumulee.qte > 0 ? formatNumber(p.situationCumulee.qte, 0) : ''}</td>
                <td class="right">${formatNumber(p.prix, 2)}</td>
                <td class="right">${p.situationCumulee.montant > 0 ? formatEuros(p.situationCumulee.montant) : ''}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total">
              <td colspan="2" class="left">MONTANT TOTAL HT</td>
              <td></td>
              <td class="right">${formatEuros(situationParPrestation.totaux.cumulPrecedent.montant)}</td>
              <td></td>
              <td class="right">${formatEuros(situationParPrestation.totaux.situationMois.montant)}</td>
              <td></td>
              <td></td>
              <td class="right">${formatEuros(situationParPrestation.totaux.situationCumulee.montant)}</td>
            </tr>
            <tr class="total">
              <td colspan="2" class="left">MONTANT TTC</td>
              <td></td>
              <td class="right">${formatEuros(situationParPrestation.ttc.cumulPrecedent)}</td>
              <td></td>
              <td class="right">${formatEuros(situationParPrestation.ttc.situationMois)}</td>
              <td></td>
              <td></td>
              <td class="right">${formatEuros(situationParPrestation.ttc.situationCumulee)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <p>Conditions de règlement: 30 jours</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (listeClients.length === 0) {
    return (
      <div className="situation-mensuelle">
        <h2>Situation Client</h2>
        <div className="empty-state">
          <p>Aucun client disponible</p>
          <p className="hint">Importez des plans via l'onglet "Import Excel"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="situation-mensuelle">
      <div className="situation-header">
        <h2>Situation Client</h2>

        <div className="filters-row">
          <div className="client-selector">
            <Users size={20} />
            <select
              value={clientActif || ''}
              onChange={(e) => handleClientChange(e.target.value)}
            >
              {listeClients.map(c => (
                <option key={c.code} value={c.code}>{c.nom || c.code}</option>
              ))}
            </select>
          </div>

          <div className="chantier-selector">
            <Building size={20} />
            <select
              value={chantierActif || ''}
              onChange={(e) => handleChantierChange(e.target.value)}
            >
              {chantiersClient.map(ch => (
                <option key={ch.code} value={ch.code}>{ch.nom || ch.code}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="month-navigation">
          <button
            className="btn btn-icon"
            onClick={() => handleMoisChange('prev')}
            disabled={moisDisponibles.indexOf(currentMonth) === 0}
          >
            <ChevronLeft size={20} />
          </button>

          <div className="current-month">
            <Calendar size={20} />
            <input
              type="month"
              value={currentMonth}
              onChange={(e) => dispatch({ type: 'SET_CURRENT_MONTH', payload: e.target.value })}
            />
            <span className="month-label">{formatMois(currentMonth)}</span>
          </div>

          <button
            className="btn btn-icon"
            onClick={() => handleMoisChange('next')}
            disabled={moisDisponibles.indexOf(currentMonth) === moisDisponibles.length - 1}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="situation-actions">
          <button className="btn btn-primary" onClick={exportToPDF}>
            <FileText size={18} />
            Export PDF
          </button>
          <button className="btn btn-secondary" onClick={exportToExcel}>
            <FileDown size={18} />
            Export Excel
          </button>
        </div>
      </div>

      {situationParPrestation && (
        <>
          <div className="situation-info">
            <p><strong>Client:</strong> {situationParPrestation.chantier.nomClient}</p>
            <p><strong>Chantier:</strong> {situationParPrestation.chantier.nomChantier}</p>
          </div>

          <div className="situation-summary">
            <div className="summary-card">
              <span className="summary-label">Situation Cumulée HT</span>
              <span className="summary-value">{formatEuros(situationParPrestation.totaux.situationCumulee.montant)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Cumul Précédent HT</span>
              <span className="summary-value">{formatEuros(situationParPrestation.totaux.cumulPrecedent.montant)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Mois HT</span>
              <span className="summary-value">{formatEuros(situationParPrestation.totaux.situationMois.montant)}</span>
            </div>
          </div>

          <div className="situation-table-container" ref={printRef}>
            <table className="situation-table">
              <thead>
                <tr>
                  <th rowSpan="2">Désignation</th>
                  <th rowSpan="2">Code</th>
                  <th colSpan="2" className="group-header">Cumul précédent</th>
                  <th colSpan="2" className="group-header">Situation du Mois</th>
                  <th colSpan="3" className="group-header">Situation cumulée</th>
                </tr>
                <tr>
                  <th className="sub-header">Qté</th>
                  <th className="sub-header">Montant</th>
                  <th className="sub-header">Qté</th>
                  <th className="sub-header">Montant</th>
                  <th className="sub-header">Qté</th>
                  <th className="sub-header">Prix</th>
                  <th className="sub-header">Montant</th>
                </tr>
              </thead>
              <tbody>
                {situationParPrestation.prestations.map(p => (
                  <tr key={p.code}>
                    <td className="designation">{p.designation}</td>
                    <td className="code">{p.code}</td>
                    <td className="amount">{p.cumulPrecedent.qte > 0 ? formatNumber(p.cumulPrecedent.qte, 0) : ''}</td>
                    <td className="amount">{p.cumulPrecedent.montant > 0 ? formatEuros(p.cumulPrecedent.montant) : ''}</td>
                    <td className="amount highlight">{p.situationMois.qte > 0 ? formatNumber(p.situationMois.qte, 0) : ''}</td>
                    <td className="amount highlight">{p.situationMois.montant > 0 ? formatEuros(p.situationMois.montant) : ''}</td>
                    <td className="amount">{p.situationCumulee.qte > 0 ? formatNumber(p.situationCumulee.qte, 0) : ''}</td>
                    <td className="amount">{formatNumber(p.prix, 2)}</td>
                    <td className="amount">{p.situationCumulee.montant > 0 ? formatEuros(p.situationCumulee.montant) : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="total">
                  <td colSpan="2"><strong>MONTANT TOTAL HT</strong></td>
                  <td></td>
                  <td className="amount"><strong>{formatEuros(situationParPrestation.totaux.cumulPrecedent.montant)}</strong></td>
                  <td></td>
                  <td className="amount highlight"><strong>{formatEuros(situationParPrestation.totaux.situationMois.montant)}</strong></td>
                  <td></td>
                  <td></td>
                  <td className="amount"><strong>{formatEuros(situationParPrestation.totaux.situationCumulee.montant)}</strong></td>
                </tr>
                <tr className="total">
                  <td colSpan="2"><strong>MONTANT TTC</strong></td>
                  <td></td>
                  <td className="amount"><strong>{formatEuros(situationParPrestation.ttc.cumulPrecedent)}</strong></td>
                  <td></td>
                  <td className="amount highlight"><strong>{formatEuros(situationParPrestation.ttc.situationMois)}</strong></td>
                  <td></td>
                  <td></td>
                  <td className="amount"><strong>{formatEuros(situationParPrestation.ttc.situationCumulee)}</strong></td>
                </tr>
              </tfoot>
            </table>

            {situationParPrestation.prestations.length === 0 && (
              <div className="empty-state">
                <p>Aucune prestation pour ce chantier</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
