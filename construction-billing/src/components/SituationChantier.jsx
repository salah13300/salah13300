import { useState, useMemo } from 'react';
import { useChantier } from '../context/ChantierContext';
import {
  calculerSituationChantier,
  formatEuros,
  formatNumber,
  getMoisDisponibles,
  getClientsUniques,
  getChantiersParClient,
  calculerAvancementCumule,
  getMoisPrecedent
} from '../utils/calculations';
import { Calendar, Save, FileDown, ChevronLeft, ChevronRight, Users, Building, Plus, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SituationChantier() {
  const { state, dispatch } = useChantier();
  const { plans, clients, articlesManuals, currentMonth, currentClient, currentChantier, config } = state;

  const [editingAvancements, setEditingAvancements] = useState({});
  const [showAddArticle, setShowAddArticle] = useState(false);
  const [newArticle, setNewArticle] = useState({
    designation: '',
    quantite: 0,
    unite: 'kg',
    prixUnitaire: 0,
  });

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

  const situation = useMemo(() => {
    if (!chantierActif) return null;
    return calculerSituationChantier(plans, chantierActif, currentMonth, clients, config, articlesManuals);
  }, [plans, chantierActif, currentMonth, clients, config, articlesManuals]);

  const moisPrecedent = getMoisPrecedent(currentMonth);

  const handleClientChange = (codeClient) => {
    dispatch({ type: 'SET_CURRENT_CLIENT', payload: codeClient });
    dispatch({ type: 'SET_CURRENT_CHANTIER', payload: null }); // Reset chantier
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

  // Copier les avancements du mois précédent
  const copierMoisPrecedent = () => {
    if (!situation) return;

    const newAvancements = {};
    situation.details.forEach(detail => {
      newAvancements[detail.plan.id] = detail.avancementAncien;
    });
    setEditingAvancements(newAvancements);
  };

  // Ajouter un article manuel
  const handleAddArticle = () => {
    if (!newArticle.designation) return;

    const montant = newArticle.quantite * newArticle.prixUnitaire;

    dispatch({
      type: 'ADD_ARTICLE_MANUAL',
      payload: {
        ...newArticle,
        montant,
        codeChantier: chantierActif,
        codeClient: clientActif,
        mois: currentMonth,
      }
    });

    setNewArticle({
      designation: '',
      quantite: 0,
      unite: 'kg',
      prixUnitaire: 0,
    });
    setShowAddArticle(false);
  };

  const handleDeleteArticle = (articleId) => {
    dispatch({ type: 'DELETE_ARTICLE_MANUAL', payload: articleId });
  };

  const exportToExcel = () => {
    if (!situation) return;

    const data = situation.details.map(d => ({
      'N° Plan': d.plan.numeroPlan,
      'Désignation': d.plan.designation,
      'Usine': d.plan.usine,
      'BL. N°': d.plan.blNumero,
      'Poids ASS Cmd': d.plan.poidsASSCommande,
      'Poids CF Cmd': d.plan.poidsCFCommande,
      'Poids ASS Fact': d.plan.poidsASSFacture,
      'Poids CF Fact': d.plan.poidsCFFacture,
      'Avancement Ancien (%)': d.avancementAncien,
      'Avancement Nouveau (%)': d.avancementNouveau,
      'Avancement Mois (%)': d.avancementMois,
      'Montant HT': d.montantTotalNouveau,
    }));

    // Ajouter les articles manuels
    situation.articlesManuals.forEach(a => {
      data.push({
        'Désignation': a.designation,
        'Montant HT': a.montant,
      });
    });

    data.push({});
    data.push({
      'N° Plan': 'TOTAL HT',
      'Montant HT': situation.totalHT.nouveauCumul,
    });
    data.push({
      'N° Plan': 'TVA ' + config.tva + '%',
      'Montant HT': situation.tva.nouveauCumul,
    });
    data.push({
      'N° Plan': 'TOTAL TTC',
      'Montant HT': situation.totalTTC.nouveauCumul,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Situation');
    XLSX.writeFile(wb, `situation_${chantierActif}_${currentMonth}.xlsx`);
  };

  const formatMois = (mois) => {
    const [year, month] = mois.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  if (listeClients.length === 0) {
    return (
      <div className="situation-chantier">
        <h2>Situation par Chantier</h2>
        <div className="empty-state">
          <p>Aucun client disponible</p>
          <p className="hint">Importez des plans via l'onglet "Import Excel"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="situation-chantier">
      <div className="situation-header">
        <h2>Situation par Chantier</h2>

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
          <button className="btn btn-outline" onClick={copierMoisPrecedent}>
            Reprendre mois précédent
          </button>
          {Object.keys(editingAvancements).length > 0 && (
            <button className="btn btn-primary" onClick={saveAllAvancements}>
              <Save size={18} />
              Enregistrer
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowAddArticle(true)}>
            <Plus size={18} />
            Ajouter article
          </button>
          <button className="btn btn-secondary" onClick={exportToExcel}>
            <FileDown size={18} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Modal d'ajout d'article */}
      {showAddArticle && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Ajouter un article manuel</h3>
            <div className="form-group">
              <label>Désignation</label>
              <input
                type="text"
                value={newArticle.designation}
                onChange={(e) => setNewArticle({ ...newArticle, designation: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Quantité</label>
                <input
                  type="number"
                  value={newArticle.quantite}
                  onChange={(e) => setNewArticle({ ...newArticle, quantite: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label>Unité</label>
                <select
                  value={newArticle.unite}
                  onChange={(e) => setNewArticle({ ...newArticle, unite: e.target.value })}
                >
                  <option value="kg">kg</option>
                  <option value="m²">m²</option>
                  <option value="ml">ml</option>
                  <option value="u">unité</option>
                  <option value="forfait">forfait</option>
                </select>
              </div>
              <div className="form-group">
                <label>Prix unitaire HT</label>
                <input
                  type="number"
                  step="0.01"
                  value={newArticle.prixUnitaire}
                  onChange={(e) => setNewArticle({ ...newArticle, prixUnitaire: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Montant HT</label>
              <input
                type="text"
                value={formatEuros(newArticle.quantite * newArticle.prixUnitaire)}
                disabled
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddArticle(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleAddArticle}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {situation && (
        <>
          <div className="situation-info">
            <p><strong>Client:</strong> {situation.nomClient} ({situation.codeClient})</p>
            <p><strong>Chantier:</strong> {situation.nomChantier} ({situation.codeChantier})</p>
          </div>

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
                  <th rowSpan="2">Usine</th>
                  <th rowSpan="2">BL. N°</th>
                  <th colSpan="2" className="group-header">Commandé (kg)</th>
                  <th colSpan="2" className="group-header">Facturé (kg)</th>
                  <th colSpan="3" className="group-header">Avancement (%)</th>
                  <th colSpan="3" className="group-header">Montant HT</th>
                </tr>
                <tr>
                  <th className="sub-header">ASS</th>
                  <th className="sub-header">CF</th>
                  <th className="sub-header">ASS</th>
                  <th className="sub-header">CF</th>
                  <th className="sub-header">Ancien</th>
                  <th className="sub-header">Nouveau</th>
                  <th className="sub-header">Mois</th>
                  <th className="sub-header">Nouv. Cumul</th>
                  <th className="sub-header">Ancien</th>
                  <th className="sub-header">Mois</th>
                </tr>
              </thead>
              <tbody>
                {situation.details.map(detail => {
                  const currentAvancement = editingAvancements[detail.plan.id] ?? detail.avancementNouveau;

                  return (
                    <tr key={detail.plan.id}>
                      <td className="plan-number">{detail.plan.numeroPlan}</td>
                      <td className="designation">{detail.plan.designation}</td>
                      <td>{detail.plan.usine}</td>
                      <td>{detail.plan.blNumero}</td>
                      <td className="amount">{formatNumber(detail.plan.poidsASSCommande, 0)}</td>
                      <td className="amount">{formatNumber(detail.plan.poidsCFCommande, 0)}</td>
                      <td className="amount">{formatNumber(detail.plan.poidsASSFacture, 0)}</td>
                      <td className="amount">{formatNumber(detail.plan.poidsCFFacture, 0)}</td>
                      <td className="amount">{formatNumber(detail.avancementAncien, 0)}</td>
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
                      </td>
                      <td className="amount highlight">{formatNumber(detail.avancementMois, 0)}</td>
                      <td className="amount">{formatEuros(detail.montantTotalNouveau)}</td>
                      <td className="amount">{formatEuros(detail.montantTotalAncien)}</td>
                      <td className="amount highlight">{formatEuros(detail.montantTotalMois)}</td>
                    </tr>
                  );
                })}

                {/* Articles manuels */}
                {situation.articlesManuals.map(article => (
                  <tr key={article.id} className="manual-article">
                    <td colSpan="4" className="designation">
                      {article.designation}
                      <button
                        className="btn btn-icon btn-danger"
                        onClick={() => handleDeleteArticle(article.id)}
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                    <td colSpan="7" className="amount">
                      {article.quantite} {article.unite} x {formatEuros(article.prixUnitaire)}
                    </td>
                    <td className="amount" colSpan="3">{formatEuros(article.montant)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="subtotal">
                  <td colSpan="4"><strong>Total Acier ASS</strong></td>
                  <td className="amount">{formatNumber(situation.quantites.ass.nouveauCumul, 0)}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="amount">{formatEuros(situation.totaux.ass.nouveauCumul)}</td>
                  <td className="amount">{formatEuros(situation.totaux.ass.ancienCumul)}</td>
                  <td className="amount">{formatEuros(situation.totaux.ass.mois)}</td>
                </tr>
                <tr className="subtotal">
                  <td colSpan="4"><strong>Total Acier CF</strong></td>
                  <td></td>
                  <td className="amount">{formatNumber(situation.quantites.cf.nouveauCumul, 0)}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="amount">{formatEuros(situation.totaux.cf.nouveauCumul)}</td>
                  <td className="amount">{formatEuros(situation.totaux.cf.ancienCumul)}</td>
                  <td className="amount">{formatEuros(situation.totaux.cf.mois)}</td>
                </tr>
                <tr className="total">
                  <td colSpan="11"><strong>TOTAL HT</strong></td>
                  <td className="amount"><strong>{formatEuros(situation.totalHT.nouveauCumul)}</strong></td>
                  <td className="amount"><strong>{formatEuros(situation.totalHT.ancienCumul)}</strong></td>
                  <td className="amount"><strong>{formatEuros(situation.totalHT.mois)}</strong></td>
                </tr>
                <tr>
                  <td colSpan="11">TVA {config.tva}%</td>
                  <td className="amount">{formatEuros(situation.tva.nouveauCumul)}</td>
                  <td className="amount">{formatEuros(situation.tva.ancienCumul)}</td>
                  <td className="amount">{formatEuros(situation.tva.mois)}</td>
                </tr>
                <tr className="total">
                  <td colSpan="11"><strong>TOTAL TTC</strong></td>
                  <td className="amount"><strong>{formatEuros(situation.totalTTC.nouveauCumul)}</strong></td>
                  <td className="amount"><strong>{formatEuros(situation.totalTTC.ancienCumul)}</strong></td>
                  <td className="amount"><strong>{formatEuros(situation.totalTTC.mois)}</strong></td>
                </tr>
              </tfoot>
            </table>

            {situation.details.length === 0 && (
              <div className="empty-state">
                <p>Aucun plan pour ce chantier</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
