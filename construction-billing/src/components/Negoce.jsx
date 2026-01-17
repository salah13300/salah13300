import { useState, useMemo } from 'react';
import { useChantier } from '../context/ChantierContext';
import { formatEuros, formatNumber, getClientsUniques, getChantiersParClient } from '../utils/calculations';
import { Plus, Trash2, Edit2, Save, X, FileDown, ShoppingCart, Users, Building } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function Negoce() {
  const { state, dispatch } = useChantier();
  const { plans, negoce, clients, currentClient, config } = state;

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterClient, setFilterClient] = useState('');
  const [filterChantier, setFilterChantier] = useState('');

  const [formData, setFormData] = useState({
    designation: '',
    codeClient: '',
    codeChantier: '',
    quantite: 0,
    unite: 'kg',
    prixAchat: 0,
    prixVente: 0,
    dateCommande: new Date().toISOString().slice(0, 10),
    dateLivraison: '',
    blNumero: '',
    statut: 'en_cours', // en_cours, livre, facture
  });

  const listeClients = useMemo(() => getClientsUniques(plans), [plans]);

  const chantiersClient = useMemo(() => {
    if (!formData.codeClient) return [];
    return getChantiersParClient(plans, formData.codeClient);
  }, [plans, formData.codeClient]);

  // Filtrage des articles négoce
  const negoceFiltre = useMemo(() => {
    return negoce.filter(item => {
      if (filterClient && item.codeClient !== filterClient) return false;
      if (filterChantier && item.codeChantier !== filterChantier) return false;
      return true;
    });
  }, [negoce, filterClient, filterChantier]);

  // Calculs totaux
  const totaux = useMemo(() => {
    return negoceFiltre.reduce((acc, item) => {
      const montantAchat = item.quantite * item.prixAchat;
      const montantVente = item.quantite * item.prixVente;
      const marge = montantVente - montantAchat;

      return {
        quantite: acc.quantite + item.quantite,
        montantAchat: acc.montantAchat + montantAchat,
        montantVente: acc.montantVente + montantVente,
        marge: acc.marge + marge,
      };
    }, { quantite: 0, montantAchat: 0, montantVente: 0, marge: 0 });
  }, [negoceFiltre]);

  const handleSubmit = () => {
    if (!formData.designation || !formData.codeClient) return;

    if (editingId) {
      dispatch({
        type: 'UPDATE_NEGOCE',
        payload: { id: editingId, ...formData }
      });
      setEditingId(null);
    } else {
      dispatch({
        type: 'ADD_NEGOCE',
        payload: formData
      });
    }

    resetForm();
  };

  const handleEdit = (item) => {
    setFormData({
      designation: item.designation,
      codeClient: item.codeClient,
      codeChantier: item.codeChantier,
      quantite: item.quantite,
      unite: item.unite,
      prixAchat: item.prixAchat,
      prixVente: item.prixVente,
      dateCommande: item.dateCommande,
      dateLivraison: item.dateLivraison || '',
      blNumero: item.blNumero || '',
      statut: item.statut,
    });
    setEditingId(item.id);
    setShowAddForm(true);
  };

  const handleDelete = (id) => {
    if (confirm('Supprimer cet article de négoce ?')) {
      dispatch({ type: 'DELETE_NEGOCE', payload: id });
    }
  };

  const resetForm = () => {
    setFormData({
      designation: '',
      codeClient: '',
      codeChantier: '',
      quantite: 0,
      unite: 'kg',
      prixAchat: 0,
      prixVente: 0,
      dateCommande: new Date().toISOString().slice(0, 10),
      dateLivraison: '',
      blNumero: '',
      statut: 'en_cours',
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const exportToExcel = () => {
    const data = negoceFiltre.map(item => ({
      'Désignation': item.designation,
      'Client': clients[item.codeClient]?.nom || item.codeClient,
      'Chantier': item.codeChantier,
      'Quantité': item.quantite,
      'Unité': item.unite,
      'Prix Achat': item.prixAchat,
      'Prix Vente': item.prixVente,
      'Montant Achat': item.quantite * item.prixAchat,
      'Montant Vente': item.quantite * item.prixVente,
      'Marge': (item.quantite * item.prixVente) - (item.quantite * item.prixAchat),
      'Date Commande': item.dateCommande,
      'Date Livraison': item.dateLivraison,
      'BL N°': item.blNumero,
      'Statut': item.statut === 'en_cours' ? 'En cours' : item.statut === 'livre' ? 'Livré' : 'Facturé',
    }));

    data.push({});
    data.push({
      'Désignation': 'TOTAUX',
      'Quantité': totaux.quantite,
      'Montant Achat': totaux.montantAchat,
      'Montant Vente': totaux.montantVente,
      'Marge': totaux.marge,
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Négoce');
    XLSX.writeFile(wb, `negoce_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getStatutBadge = (statut) => {
    const badges = {
      en_cours: { class: 'badge-warning', label: 'En cours' },
      livre: { class: 'badge-info', label: 'Livré' },
      facture: { class: 'badge-success', label: 'Facturé' },
    };
    return badges[statut] || badges.en_cours;
  };

  return (
    <div className="negoce">
      <div className="negoce-header">
        <h2><ShoppingCart size={24} /> Négoce</h2>

        <div className="filters-row">
          <div className="filter-group">
            <Users size={18} />
            <select
              value={filterClient}
              onChange={(e) => {
                setFilterClient(e.target.value);
                setFilterChantier('');
              }}
            >
              <option value="">Tous les clients</option>
              {listeClients.map(c => (
                <option key={c.code} value={c.code}>{c.nom || c.code}</option>
              ))}
            </select>
          </div>

          {filterClient && (
            <div className="filter-group">
              <Building size={18} />
              <select
                value={filterChantier}
                onChange={(e) => setFilterChantier(e.target.value)}
              >
                <option value="">Tous les chantiers</option>
                {getChantiersParClient(plans, filterClient).map(ch => (
                  <option key={ch.code} value={ch.code}>{ch.nom || ch.code}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="negoce-actions">
          <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
            <Plus size={18} />
            Ajouter article
          </button>
          <button className="btn btn-secondary" onClick={exportToExcel}>
            <FileDown size={18} />
            Export Excel
          </button>
        </div>
      </div>

      {/* Formulaire d'ajout/édition */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal modal-large">
            <div className="modal-header">
              <h3>{editingId ? 'Modifier article' : 'Ajouter un article de négoce'}</h3>
              <button className="btn btn-icon" onClick={resetForm}>
                <X size={20} />
              </button>
            </div>

            <div className="form-grid">
              <div className="form-group full-width">
                <label>Désignation *</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="Description de l'article"
                />
              </div>

              <div className="form-group">
                <label>Client *</label>
                <select
                  value={formData.codeClient}
                  onChange={(e) => setFormData({ ...formData, codeClient: e.target.value, codeChantier: '' })}
                >
                  <option value="">Sélectionner un client</option>
                  {listeClients.map(c => (
                    <option key={c.code} value={c.code}>{c.nom || c.code}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Chantier</label>
                <select
                  value={formData.codeChantier}
                  onChange={(e) => setFormData({ ...formData, codeChantier: e.target.value })}
                  disabled={!formData.codeClient}
                >
                  <option value="">Sélectionner un chantier</option>
                  {chantiersClient.map(ch => (
                    <option key={ch.code} value={ch.code}>{ch.nom || ch.code}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Quantité</label>
                <input
                  type="number"
                  value={formData.quantite}
                  onChange={(e) => setFormData({ ...formData, quantite: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label>Unité</label>
                <select
                  value={formData.unite}
                  onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                >
                  <option value="kg">kg</option>
                  <option value="m²">m²</option>
                  <option value="ml">ml</option>
                  <option value="u">unité</option>
                  <option value="forfait">forfait</option>
                </select>
              </div>

              <div className="form-group">
                <label>Prix d'achat HT</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.prixAchat}
                  onChange={(e) => setFormData({ ...formData, prixAchat: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label>Prix de vente HT</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.prixVente}
                  onChange={(e) => setFormData({ ...formData, prixVente: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label>Marge</label>
                <input
                  type="text"
                  value={formatEuros((formData.prixVente - formData.prixAchat) * formData.quantite)}
                  disabled
                />
              </div>

              <div className="form-group">
                <label>Date commande</label>
                <input
                  type="date"
                  value={formData.dateCommande}
                  onChange={(e) => setFormData({ ...formData, dateCommande: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Date livraison</label>
                <input
                  type="date"
                  value={formData.dateLivraison}
                  onChange={(e) => setFormData({ ...formData, dateLivraison: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>N° BL</label>
                <input
                  type="text"
                  value={formData.blNumero}
                  onChange={(e) => setFormData({ ...formData, blNumero: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Statut</label>
                <select
                  value={formData.statut}
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                >
                  <option value="en_cours">En cours</option>
                  <option value="livre">Livré</option>
                  <option value="facture">Facturé</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={resetForm}>Annuler</button>
              <button className="btn btn-primary" onClick={handleSubmit}>
                <Save size={18} />
                {editingId ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Résumé */}
      <div className="negoce-summary">
        <div className="summary-card">
          <span className="summary-label">Nombre d'articles</span>
          <span className="summary-value">{negoceFiltre.length}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Achats HT</span>
          <span className="summary-value">{formatEuros(totaux.montantAchat)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Total Ventes HT</span>
          <span className="summary-value">{formatEuros(totaux.montantVente)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Marge Totale</span>
          <span className={`summary-value ${totaux.marge >= 0 ? 'positive' : 'negative'}`}>
            {formatEuros(totaux.marge)}
          </span>
        </div>
      </div>

      {/* Tableau */}
      <div className="negoce-table-container">
        <table className="negoce-table">
          <thead>
            <tr>
              <th>Désignation</th>
              <th>Client</th>
              <th>Chantier</th>
              <th>Qté</th>
              <th>Unité</th>
              <th>P.A. HT</th>
              <th>P.V. HT</th>
              <th>Montant Vente</th>
              <th>Marge</th>
              <th>BL N°</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {negoceFiltre.map(item => {
              const montantAchat = item.quantite * item.prixAchat;
              const montantVente = item.quantite * item.prixVente;
              const marge = montantVente - montantAchat;
              const badge = getStatutBadge(item.statut);

              return (
                <tr key={item.id}>
                  <td className="designation">{item.designation}</td>
                  <td>{clients[item.codeClient]?.nom || item.codeClient}</td>
                  <td>{item.codeChantier}</td>
                  <td className="amount">{formatNumber(item.quantite, 0)}</td>
                  <td>{item.unite}</td>
                  <td className="amount">{formatEuros(item.prixAchat)}</td>
                  <td className="amount">{formatEuros(item.prixVente)}</td>
                  <td className="amount">{formatEuros(montantVente)}</td>
                  <td className={`amount ${marge >= 0 ? 'positive' : 'negative'}`}>
                    {formatEuros(marge)}
                  </td>
                  <td>{item.blNumero}</td>
                  <td>
                    <span className={`badge ${badge.class}`}>{badge.label}</span>
                  </td>
                  <td className="actions">
                    <button className="btn btn-icon" onClick={() => handleEdit(item)} title="Modifier">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn btn-icon btn-danger" onClick={() => handleDelete(item.id)} title="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {negoceFiltre.length > 0 && (
            <tfoot>
              <tr className="total">
                <td colSpan="3"><strong>TOTAUX</strong></td>
                <td className="amount"><strong>{formatNumber(totaux.quantite, 0)}</strong></td>
                <td colSpan="3"></td>
                <td className="amount"><strong>{formatEuros(totaux.montantVente)}</strong></td>
                <td className={`amount ${totaux.marge >= 0 ? 'positive' : 'negative'}`}>
                  <strong>{formatEuros(totaux.marge)}</strong>
                </td>
                <td colSpan="3"></td>
              </tr>
            </tfoot>
          )}
        </table>

        {negoceFiltre.length === 0 && (
          <div className="empty-state">
            <ShoppingCart size={48} />
            <p>Aucun article de négoce</p>
            <p className="hint">Cliquez sur "Ajouter article" pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );
}
