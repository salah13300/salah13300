import { useState, useMemo } from 'react';
import { useChantier } from '../context/ChantierContext';
import { calculerMontantPlan, formatEuros, formatNumber } from '../utils/calculations';
import { Search, Trash2, Edit2, Filter, ChevronDown, ChevronUp } from 'lucide-react';

export default function PlansManager() {
  const { state, dispatch } = useChantier();
  const { plans, config } = state;

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortField, setSortField] = useState('numeroPlan');
  const [sortDirection, setSortDirection] = useState('asc');
  const [editingPlan, setEditingPlan] = useState(null);

  const filteredPlans = useMemo(() => {
    let result = [...plans];

    // Filtre par recherche
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(p =>
        p.numeroPlan.toLowerCase().includes(searchLower) ||
        p.designation.toLowerCase().includes(searchLower)
      );
    }

    // Filtre par type
    if (filterType !== 'all') {
      result = result.filter(p => p.type === filterType);
    }

    // Tri
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [plans, search, filterType, sortField, sortDirection]);

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
            placeholder="Rechercher un plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-box">
          <Filter size={18} />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Tous les types</option>
            <option value="HA">Acier HA</option>
            <option value="TS">Treillis soudés</option>
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
              <th onClick={() => handleSort('designation')} className="sortable">
                Désignation <SortIcon field="designation" />
              </th>
              <th onClick={() => handleSort('type')} className="sortable">
                Type <SortIcon field="type" />
              </th>
              <th onClick={() => handleSort('poidsKg')} className="sortable">
                Poids (kg) <SortIcon field="poidsKg" />
              </th>
              <th onClick={() => handleSort('surfaceM2')} className="sortable">
                Surface (m²) <SortIcon field="surfaceM2" />
              </th>
              <th>Montant</th>
              <th onClick={() => handleSort('dateLivraison')} className="sortable">
                Livraison <SortIcon field="dateLivraison" />
              </th>
              <th>Avancement</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlans.map(plan => {
              const montant = calculerMontantPlan(plan, config);
              const avancementActuel = plan.avancements ?
                Math.max(...Object.values(plan.avancements), 0) : 0;

              return (
                <tr key={plan.id}>
                  <td className="plan-number">{plan.numeroPlan}</td>
                  <td>{plan.designation}</td>
                  <td>
                    <span className={`type-badge ${plan.type.toLowerCase()}`}>
                      {plan.type}
                    </span>
                  </td>
                  <td>{plan.type === 'HA' ? formatNumber(plan.poidsKg, 0) : '-'}</td>
                  <td>{plan.type === 'TS' ? formatNumber(plan.surfaceM2, 0) : '-'}</td>
                  <td className="amount">{formatEuros(montant)}</td>
                  <td>{plan.dateLivraison}</td>
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
                value={editingPlan.numeroPlan}
                onChange={(e) => setEditingPlan({ ...editingPlan, numeroPlan: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Désignation</label>
              <input
                type="text"
                value={editingPlan.designation}
                onChange={(e) => setEditingPlan({ ...editingPlan, designation: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select
                value={editingPlan.type}
                onChange={(e) => setEditingPlan({ ...editingPlan, type: e.target.value })}
              >
                <option value="HA">Acier HA</option>
                <option value="TS">Treillis soudés</option>
              </select>
            </div>
            {editingPlan.type === 'HA' && (
              <div className="form-group">
                <label>Poids (kg)</label>
                <input
                  type="number"
                  value={editingPlan.poidsKg}
                  onChange={(e) => setEditingPlan({ ...editingPlan, poidsKg: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}
            {editingPlan.type === 'TS' && (
              <div className="form-group">
                <label>Surface (m²)</label>
                <input
                  type="number"
                  value={editingPlan.surfaceM2}
                  onChange={(e) => setEditingPlan({ ...editingPlan, surfaceM2: parseFloat(e.target.value) || 0 })}
                />
              </div>
            )}
            <div className="form-group">
              <label>Date de livraison</label>
              <input
                type="date"
                value={editingPlan.dateLivraison}
                onChange={(e) => setEditingPlan({ ...editingPlan, dateLivraison: e.target.value })}
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
