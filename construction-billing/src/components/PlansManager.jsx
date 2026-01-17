import { useState, useMemo } from 'react';
import { useChantier } from '../context/ChantierContext';
import { calculerMontantsPlan, formatEuros, formatNumber, getClientsUniques } from '../utils/calculations';
import { Search, Trash2, Edit2, Filter, ChevronDown, ChevronUp } from 'lucide-react';

export default function PlansManager() {
  const { state, dispatch } = useChantier();
  const { plans, clients, config } = state;

  const [search, setSearch] = useState('');
  const [filterClient, setFilterClient] = useState('all');
  const [sortField, setSortField] = useState('numeroPlan');
  const [sortDirection, setSortDirection] = useState('asc');
  const [editingPlan, setEditingPlan] = useState(null);

  const listeClients = useMemo(() => getClientsUniques(plans), [plans]);

  const filteredPlans = useMemo(() => {
    let result = [...plans];

    // Filtre par recherche
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(p =>
        (p.numeroPlan || '').toLowerCase().includes(searchLower) ||
        (p.designation || '').toLowerCase().includes(searchLower) ||
        (p.nomClient || '').toLowerCase().includes(searchLower) ||
        (p.nomChantier || '').toLowerCase().includes(searchLower)
      );
    }

    // Filtre par client
    if (filterClient !== 'all') {
      result = result.filter(p => p.codeClient === filterClient);
    }

    // Tri
    result.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [plans, search, filterClient, sortField, sortDirection]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = (planId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce plan?')) {
      dispatch({ type: 'DELETE_PLAN', payload: planId });
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan({ ...plan });
  };

  const handleSaveEdit = () => {
    if (editingPlan) {
      dispatch({ type: 'UPDATE_PLAN', payload: editingPlan });
      setEditingPlan(null);
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  return (
    <div className="plans-manager">
      <h2>Gestion des Plans</h2>

      <div className="plans-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-box">
          <Filter size={18} />
          <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
            <option value="all">Tous les clients</option>
            {listeClients.map(c => (
              <option key={c.code} value={c.code}>{c.nom || c.code}</option>
            ))}
          </select>
        </div>

        <div className="plans-count">
          {filteredPlans.length} plan(s) sur {plans.length}
        </div>
      </div>

      <div className="plans-table-container">
        <table className="plans-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('numeroPlan')} className="sortable">
                N° Plan <SortIcon field="numeroPlan" />
              </th>
              <th onClick={() => handleSort('nomClient')} className="sortable">
                Client <SortIcon field="nomClient" />
              </th>
              <th onClick={() => handleSort('designation')} className="sortable">
                Désignation <SortIcon field="designation" />
              </th>
              <th>ASS (kg)</th>
              <th>CF (kg)</th>
              <th>Montant</th>
              <th onClick={() => handleSort('datePrevue')} className="sortable">
                Date prévue <SortIcon field="datePrevue" />
              </th>
              <th>Avancement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlans.map(plan => {
              const montants = calculerMontantsPlan(plan, clients, config);
              const avancementActuel = plan.avancements ?
                Math.max(...Object.values(plan.avancements), 0) : 0;

              return (
                <tr key={plan.id}>
                  <td className="plan-number">{plan.numeroPlan}</td>
                  <td>{plan.nomClient || plan.codeClient}</td>
                  <td className="designation">{plan.designation}</td>
                  <td className="amount">{plan.poidsASSCommande > 0 ? formatNumber(plan.poidsASSCommande, 0) : '-'}</td>
                  <td className="amount">{plan.poidsCFCommande > 0 ? formatNumber(plan.poidsCFCommande, 0) : '-'}</td>
                  <td className="amount">{formatEuros(montants.montantTotal)}</td>
                  <td>{plan.datePrevue}</td>
                  <td>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${avancementActuel}%` }}
                      />
                      <span className="progress-text">{avancementActuel}%</span>
                    </div>
                  </td>
                  <td className="actions">
                    <button className="btn-icon" onClick={() => handleEdit(plan)} title="Modifier">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon danger" onClick={() => handleDelete(plan.id)} title="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredPlans.length === 0 && (
          <div className="empty-state">
            <p>Aucun plan trouvé</p>
            <p className="hint">Importez des plans via l'onglet "Import Excel"</p>
          </div>
        )}
      </div>

      {editingPlan && (
        <div className="modal-overlay" onClick={() => setEditingPlan(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Modifier le plan</h3>
            <div className="form-group">
              <label>N° Plan</label>
              <input
                type="text"
                value={editingPlan.numeroPlan || ''}
                onChange={(e) => setEditingPlan({ ...editingPlan, numeroPlan: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Désignation</label>
              <input
                type="text"
                value={editingPlan.designation || ''}
                onChange={(e) => setEditingPlan({ ...editingPlan, designation: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Poids ASS (kg)</label>
                <input
                  type="number"
                  value={editingPlan.poidsASSCommande || 0}
                  onChange={(e) => setEditingPlan({ ...editingPlan, poidsASSCommande: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label>Poids CF (kg)</label>
                <input
                  type="number"
                  value={editingPlan.poidsCFCommande || 0}
                  onChange={(e) => setEditingPlan({ ...editingPlan, poidsCFCommande: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Date prévue</label>
              <input
                type="date"
                value={editingPlan.datePrevue || ''}
                onChange={(e) => setEditingPlan({ ...editingPlan, datePrevue: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleSaveEdit}>Enregistrer</button>
              <button className="btn btn-secondary" onClick={() => setEditingPlan(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
