import { useState, useMemo } from 'react';
import { useChantier } from '../context/ChantierContext';
import {
  calculerSituationClient,
  formatEuros,
  formatNumber,
  getMoisDisponibles,
  getClientsUniques,
  calculerAvancementCumule
} from '../utils/calculations';
import { Calendar, Save, FileDown, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SituationMensuelle() {
  const { state, dispatch } = useChantier();
  const { plans, clients, currentMonth, currentClient, config } = state;

  const [editingAvancements, setEditingAvancements] = useState({});

  const moisDisponibles = useMemo(() => getMoisDisponibles(plans), [plans]);
  const listeClients = useMemo(() => getClientsUniques(plans), [plans]);

  // Sélectionner le premier client par défaut si aucun n'est sélectionné
  const clientActif = currentClient || (listeClients.length > 0 ? listeClients[0].code : null);

  const situation = useMemo(() => {
    if (!clientActif) return null;
    return calculerSituationClient(plans, clientActif, currentMonth, clients, config);
  }, [plans, clientActif, currentMonth, clients, config]);

  const handleClientChange = (codeClient) => {
    dispatch({ type: 'SET_CURRENT_CLIENT', payload: codeClient });
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

  const handleAvancementChange = (planId, value) => {
    setEditingAvancements(prev => ({
      ...prev,
      [planId]: Math.min(100, Math.max(0, parseFloat(value) || 0))
    }));
  };

  const saveAvancement = (planId) => {
    if (editingAvancements[planId] !== undefined) {
      dispatch({
        type: 'UPDATE_PLAN_AVANCEMENT',
        payload: {
          planId,
          mois: currentMonth,
          pourcentage: editingAvancements[planId]
        }
      });
      setEditingAvancements(prev => {
        const newState = { ...prev };
        delete newState[planId];
        return newState;
      });
    }
  };

  const saveAllAvancements = () => {
    Object.entries(editingAvancements).forEach(([planId, pourcentage]) => {
      dispatch({
        type: 'UPDATE_PLAN_AVANCEMENT',
        payload: { planId, mois: currentMonth, pourcentage }
      });
    });
    setEditingAvancements({});
  };

  const exportToExcel = () => {
    if (!situation) return;

    const data = situation.details.map(d => ({
      'N° Plan': d.plan.numeroPlan,
      'Désignation': d.plan.designation,
      'Poids ASS Commandé': d.plan.poidsASSCommande,
      'Poids CF Commandé': d.plan.poidsCFCommande,
      'Avancement (%)': d.avancementNouveau,
      'Montant ASS': d.montantASSNouveau,
      'Montant CF': d.montantCFNouveau,
      'Montant Total': d.montantTotalNouveau,
    }));

    data.push({});
    data.push({
      'N° Plan': 'TOTAL HT',
      'Montant Total': situation.totalHT.nouveauCumul,
    });
    data.push({
      'N° Plan': 'TVA ' + config.tva + '%',
      'Montant Total': situation.tva.nouveauCumul,
    });
    data.push({
      'N° Plan': 'TOTAL TTC',
      'Montant Total': situation.totalTTC.nouveauCumul,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Situation');
    XLSX.writeFile(wb, `situation_${clientActif}_${currentMonth}.xlsx`);
  };

  const formatMois = (mois) => {
    const [year, month] = mois.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  if (listeClients.length === 0) {
    return (
      <div className="situation-mensuelle">
        <h2>Situation Mensuelle</h2>
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
        <h2>Situation Mensuelle</h2>

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
          {Object.keys(editingAvancements).length > 0 && (
            <button className="btn btn-primary" onClick={saveAllAvancements}>
              <Save size={18} />
              Enregistrer
            </button>
          )}
          <button className="btn btn-secondary" onClick={exportToExcel}>
            <FileDown size={18} />
            Export Excel
          </button>
        </div>
      </div>

      {situation && (
        <>
          <div className="situation-summary">
            <div className="summary-card">
              <span className="summary-label">Nouveau Cumul HT</span>
              <span className="summary-value">{formatEuros(situation.totalHT.nouveauCumul)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Ancien Cumul HT</span>
              <span className="summary-value">{formatEuros(situation.totalHT.ancienCumul)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Mois HT</span>
              <span className="summary-value">{formatEuros(situation.totalHT.mois)}</span>
            </div>
          </div>

          <div className="situation-table-container">
            <table className="situation-table">
              <thead>
                <tr>
                  <th rowSpan="2">N° Plan</th>
                  <th rowSpan="2">Désignation</th>
                  <th colSpan="3" className="group-header">Quantité (kg)</th>
                  <th colSpan="3" className="group-header">Montant HT</th>
                  <th rowSpan="2">Avancement</th>
                </tr>
                <tr>
                  <th className="sub-header">Nouv. Cumul</th>
                  <th className="sub-header">Ancien</th>
                  <th className="sub-header">Mois</th>
                  <th className="sub-header">Nouv. Cumul</th>
                  <th className="sub-header">Ancien</th>
                  <th className="sub-header">Mois</th>
                </tr>
              </thead>
              <tbody>
                {situation.details.map(detail => {
                  const currentAvancement = editingAvancements[detail.plan.id] ?? detail.avancementNouveau;
                  const totalPoids = (detail.plan.poidsASSCommande || 0) + (detail.plan.poidsCFCommande || 0);

                  return (
                    <tr key={detail.plan.id}>
                      <td className="plan-number">{detail.plan.numeroPlan}</td>
                      <td className="designation">{detail.plan.designation}</td>
                      <td className="amount">{formatNumber(totalPoids * detail.avancementNouveau / 100, 0)}</td>
                      <td className="amount">{formatNumber(totalPoids * detail.avancementAncien / 100, 0)}</td>
                      <td className="amount highlight">{formatNumber(totalPoids * detail.avancementMois / 100, 0)}</td>
                      <td className="amount">{formatEuros(detail.montantTotalNouveau)}</td>
                      <td className="amount">{formatEuros(detail.montantTotalAncien)}</td>
                      <td className="amount highlight">{formatEuros(detail.montantTotalMois)}</td>
                      <td className="percent editable">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={currentAvancement}
                          onChange={(e) => handleAvancementChange(detail.plan.id, e.target.value)}
                          onBlur={() => saveAvancement(detail.plan.id)}
                          onKeyDown={(e) => e.key === 'Enter' && saveAvancement(detail.plan.id)}
                        />
                        %
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="subtotal">
                  <td colSpan="2"><strong>Total Acier ASS</strong></td>
                  <td className="amount">{formatNumber(situation.quantites.ass.nouveauCumul, 0)}</td>
                  <td className="amount">{formatNumber(situation.quantites.ass.ancienCumul, 0)}</td>
                  <td className="amount">{formatNumber(situation.quantites.ass.mois, 0)}</td>
                  <td className="amount">{formatEuros(situation.totaux.ass.nouveauCumul)}</td>
                  <td className="amount">{formatEuros(situation.totaux.ass.ancienCumul)}</td>
                  <td className="amount">{formatEuros(situation.totaux.ass.mois)}</td>
                  <td></td>
                </tr>
                <tr className="subtotal">
                  <td colSpan="2"><strong>Total Acier CF</strong></td>
                  <td className="amount">{formatNumber(situation.quantites.cf.nouveauCumul, 0)}</td>
                  <td className="amount">{formatNumber(situation.quantites.cf.ancienCumul, 0)}</td>
                  <td className="amount">{formatNumber(situation.quantites.cf.mois, 0)}</td>
                  <td className="amount">{formatEuros(situation.totaux.cf.nouveauCumul)}</td>
                  <td className="amount">{formatEuros(situation.totaux.cf.ancienCumul)}</td>
                  <td className="amount">{formatEuros(situation.totaux.cf.mois)}</td>
                  <td></td>
                </tr>
                <tr className="total">
                  <td colSpan="5"><strong>TOTAL HT</strong></td>
                  <td className="amount"><strong>{formatEuros(situation.totalHT.nouveauCumul)}</strong></td>
                  <td className="amount"><strong>{formatEuros(situation.totalHT.ancienCumul)}</strong></td>
                  <td className="amount"><strong>{formatEuros(situation.totalHT.mois)}</strong></td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan="5">TVA {config.tva}%</td>
                  <td className="amount">{formatEuros(situation.tva.nouveauCumul)}</td>
                  <td className="amount">{formatEuros(situation.tva.ancienCumul)}</td>
                  <td className="amount">{formatEuros(situation.tva.mois)}</td>
                  <td></td>
                </tr>
                <tr className="total">
                  <td colSpan="5"><strong>TOTAL TTC</strong></td>
                  <td className="amount"><strong>{formatEuros(situation.totalTTC.nouveauCumul)}</strong></td>
                  <td className="amount"><strong>{formatEuros(situation.totalTTC.ancienCumul)}</strong></td>
                  <td className="amount"><strong>{formatEuros(situation.totalTTC.mois)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            {situation.details.length === 0 && (
              <div className="empty-state">
                <p>Aucun plan pour ce client</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
