import { useState, useMemo } from 'react';
import { useChantier } from '../context/ChantierContext';
import {
  calculerSituation,
  formatEuros,
  formatNumber,
  getMoisDisponibles,
  getMoisPrecedent
} from '../utils/calculations';
import { Calendar, Save, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SituationMensuelle() {
  const { state, dispatch } = useChantier();
  const { plans, currentMonth, config } = state;

  const [editingAvancements, setEditingAvancements] = useState({});

  const moisDisponibles = useMemo(() => getMoisDisponibles(plans), [plans]);
  const situation = useMemo(
    () => calculerSituation(plans, currentMonth, config),
    [plans, currentMonth, config]
  );

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
    const data = situation.details.map(d => ({
      'N° Plan': d.plan.numeroPlan,
      'Désignation': d.plan.designation,
      'Type': d.plan.type,
      'Quantité': d.plan.type === 'HA' ? d.plan.poidsKg : d.plan.surfaceM2,
      'Unité': d.plan.type === 'HA' ? 'kg' : 'm²',
      'Montant Total': d.montantTotal,
      'Avancement Cumul Ant (%)': d.avancementCumulAnt,
      'Avancement Mois (%)': d.avancementMois,
      'Avancement Cumul Nouv (%)': d.avancementCumulNouveau,
      'Montant Cumul Antérieur': d.montantCumulAnt,
      'Montant Mois': d.montantMois,
      'Montant Cumul Nouveau': d.montantCumulNouveau,
      'Marge Mois': d.margeMois
    }));

    // Ajouter les totaux
    data.push({});
    data.push({
      'N° Plan': 'TOTAL',
      'Montant Cumul Antérieur': situation.totaux.total.cumulAnt,
      'Montant Mois': situation.totaux.total.mois,
      'Montant Cumul Nouveau': situation.totaux.total.cumulNouveau,
      'Marge Mois': situation.resultat.mois
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Situation');
    XLSX.writeFile(wb, `situation_${currentMonth}.xlsx`);
  };

  const formatMois = (mois) => {
    const [year, month] = mois.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  const isGain = situation.resultat.mois >= 0;

  return (
    <div className="situation-mensuelle">
      <div className="situation-header">
        <h2>Situation Mensuelle</h2>

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
              Enregistrer les avancements
            </button>
          )}
          <button className="btn btn-secondary" onClick={exportToExcel}>
            <FileDown size={18} />
            Exporter Excel
          </button>
        </div>
      </div>

      <div className="situation-summary">
        <div className={`summary-card ${isGain ? 'positive' : 'negative'}`}>
          <span className="summary-label">Résultat du mois</span>
          <span className="summary-value">{formatEuros(situation.resultat.mois)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">CA du mois</span>
          <span className="summary-value">{formatEuros(situation.totaux.total.mois)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Cumul CA</span>
          <span className="summary-value">{formatEuros(situation.totaux.total.cumulNouveau)}</span>
        </div>
      </div>

      <div className="situation-table-container">
        <table className="situation-table">
          <thead>
            <tr>
              <th rowSpan="2">N° Plan</th>
              <th rowSpan="2">Désignation</th>
              <th rowSpan="2">Type</th>
              <th rowSpan="2">Qté</th>
              <th rowSpan="2">Montant Total</th>
              <th colSpan="3" className="group-header">Avancement (%)</th>
              <th colSpan="3" className="group-header">Montant</th>
              <th rowSpan="2">Marge Mois</th>
            </tr>
            <tr>
              <th className="sub-header">Cumul Ant.</th>
              <th className="sub-header">Mois</th>
              <th className="sub-header">Nouv. Cumul</th>
              <th className="sub-header">Cumul Ant.</th>
              <th className="sub-header">Mois</th>
              <th className="sub-header">Nouv. Cumul</th>
            </tr>
          </thead>
          <tbody>
            {situation.details.map(detail => {
              const currentAvancement = editingAvancements[detail.plan.id] ??
                detail.avancementCumulNouveau;

              return (
                <tr key={detail.plan.id}>
                  <td className="plan-number">{detail.plan.numeroPlan}</td>
                  <td className="designation">{detail.plan.designation}</td>
                  <td>
                    <span className={`type-badge ${detail.plan.type.toLowerCase()}`}>
                      {detail.plan.type}
                    </span>
                  </td>
                  <td className="quantity">
                    {detail.plan.type === 'HA'
                      ? `${formatNumber(detail.plan.poidsKg, 0)} kg`
                      : `${formatNumber(detail.plan.surfaceM2, 0)} m²`
                    }
                  </td>
                  <td className="amount">{formatEuros(detail.montantTotal)}</td>
                  <td className="percent">{formatNumber(detail.avancementCumulAnt, 0)}%</td>
                  <td className="percent highlight">{formatNumber(detail.avancementMois, 0)}%</td>
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
                  <td className="amount">{formatEuros(detail.montantCumulAnt)}</td>
                  <td className="amount highlight">{formatEuros(detail.montantMois)}</td>
                  <td className="amount">{formatEuros(detail.montantCumulNouveau)}</td>
                  <td className={`amount ${detail.margeMois >= 0 ? 'positive' : 'negative'}`}>
                    {formatEuros(detail.margeMois)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="subtotal ha">
              <td colSpan="4"><strong>Total Acier HA</strong></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td className="amount">{formatEuros(situation.totaux.ha.cumulAnt)}</td>
              <td className="amount">{formatEuros(situation.totaux.ha.mois)}</td>
              <td className="amount">{formatEuros(situation.totaux.ha.cumulNouveau)}</td>
              <td></td>
            </tr>
            <tr className="subtotal ts">
              <td colSpan="4"><strong>Total Treillis Soudés</strong></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td className="amount">{formatEuros(situation.totaux.ts.cumulAnt)}</td>
              <td className="amount">{formatEuros(situation.totaux.ts.mois)}</td>
              <td className="amount">{formatEuros(situation.totaux.ts.cumulNouveau)}</td>
              <td></td>
            </tr>
            <tr className="total">
              <td colSpan="4"><strong>TOTAL GÉNÉRAL</strong></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td className="amount"><strong>{formatEuros(situation.totaux.total.cumulAnt)}</strong></td>
              <td className="amount"><strong>{formatEuros(situation.totaux.total.mois)}</strong></td>
              <td className="amount"><strong>{formatEuros(situation.totaux.total.cumulNouveau)}</strong></td>
              <td className={`amount ${isGain ? 'positive' : 'negative'}`}>
                <strong>{formatEuros(situation.resultat.mois)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>

        {situation.details.length === 0 && (
          <div className="empty-state">
            <p>Aucun plan disponible</p>
            <p className="hint">Importez des plans via l'onglet "Import Excel"</p>
          </div>
        )}
      </div>
    </div>
  );
}
