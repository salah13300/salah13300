import { useState, useMemo } from 'react';
import { useChantier } from '../context/ChantierContext';
import { formatEuros, formatNumber } from '../utils/calculations';
import { Users, Building, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronRight } from 'lucide-react';

export default function Clients() {
  const { state, dispatch } = useChantier();
  const { clients, config } = state;

  const [expandedClients, setExpandedClients] = useState({});
  const [editingChantier, setEditingChantier] = useState(null); // { codeClient, codeChantier }
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddChantier, setShowAddChantier] = useState(null); // codeClient
  const [newClient, setNewClient] = useState({ code: '', nom: '' });
  const [newChantier, setNewChantier] = useState({ code: '', nom: '' });

  // Convertir l'objet clients en tableau pour l'affichage
  const clientsList = useMemo(() => {
    return Object.entries(clients).map(([code, data]) => ({
      code,
      nom: data.nom || code,
      chantiers: Object.entries(data.chantiers || {}).map(([chCode, chData]) => ({
        code: chCode,
        nom: chData.nom || chCode,
        prixASS: chData.prixASS ?? config.prixASSDefaut,
        prixCF: chData.prixCF ?? config.prixCFDefaut,
        prixTS: chData.prixTS ?? config.prixTSDefaut,
        coutASS: chData.coutASS ?? config.coutASS,
        coutCF: chData.coutCF ?? config.coutCF,
        coutTS: chData.coutTS ?? config.coutTS,
      }))
    }));
  }, [clients, config]);

  const toggleClient = (code) => {
    setExpandedClients(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const handleAddClient = () => {
    if (!newClient.code || !newClient.nom) return;
    dispatch({ type: 'ADD_CLIENT', payload: newClient });
    setNewClient({ code: '', nom: '' });
    setShowAddClient(false);
    setExpandedClients(prev => ({ ...prev, [newClient.code]: true }));
  };

  const handleAddChantier = (codeClient) => {
    if (!newChantier.code || !newChantier.nom) return;
    dispatch({
      type: 'ADD_CHANTIER',
      payload: { codeClient, codeChantier: newChantier.code, nom: newChantier.nom }
    });
    setNewChantier({ code: '', nom: '' });
    setShowAddChantier(null);
  };

  const handleUpdatePrix = (codeClient, codeChantier, field, value) => {
    dispatch({
      type: 'UPDATE_CHANTIER_PRIX',
      payload: {
        codeClient,
        codeChantier,
        prix: { [field]: parseFloat(value) || 0 }
      }
    });
  };

  const handleDeleteClient = (code) => {
    if (confirm(`Supprimer le client ${code} et tous ses chantiers ?`)) {
      dispatch({ type: 'DELETE_CLIENT', payload: code });
    }
  };

  const handleDeleteChantier = (codeClient, codeChantier) => {
    if (confirm(`Supprimer le chantier ${codeChantier} ?`)) {
      dispatch({ type: 'DELETE_CHANTIER', payload: { codeClient, codeChantier } });
    }
  };

  return (
    <div className="clients-page">
      <div className="page-header">
        <h2><Users size={24} /> Gestion des Clients et Chantiers</h2>
        <button className="btn btn-primary" onClick={() => setShowAddClient(true)}>
          <Plus size={18} /> Nouveau Client
        </button>
      </div>

      {showAddClient && (
        <div className="add-form-card">
          <h3>Nouveau Client</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Code Client *</label>
              <input
                type="text"
                value={newClient.code}
                onChange={(e) => setNewClient({ ...newClient, code: e.target.value.toUpperCase() })}
                placeholder="Ex: BATARM"
              />
            </div>
            <div className="form-group">
              <label>Nom Client *</label>
              <input
                type="text"
                value={newClient.nom}
                onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })}
                placeholder="Ex: BATI ARMA CRETEIL"
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddClient(false)}>
                <X size={16} /> Annuler
              </button>
              <button className="btn btn-primary" onClick={handleAddClient}>
                <Save size={16} /> Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="info-box">
        <p><strong>Prix par défaut :</strong> ASS Vente: {formatEuros(config.prixASSDefaut)}/kg | CF Vente: {formatEuros(config.prixCFDefaut)}/kg | TS Vente: {formatEuros(config.prixTSDefaut)}/kg</p>
        <p><strong>Coûts par défaut :</strong> ASS: {formatEuros(config.coutASS)}/kg | CF: {formatEuros(config.coutCF)}/kg | TS: {formatEuros(config.coutTS)}/kg</p>
      </div>

      {clientsList.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <p>Aucun client enregistré</p>
          <p className="hint">Importez des plans ou créez un client manuellement</p>
        </div>
      ) : (
        <div className="clients-list">
          {clientsList.map(client => (
            <div key={client.code} className="client-card">
              <div className="client-header" onClick={() => toggleClient(client.code)}>
                <div className="client-info">
                  {expandedClients[client.code] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  <span className="client-code">{client.code}</span>
                  <span className="client-nom">{client.nom}</span>
                  <span className="chantier-count">{client.chantiers.length} chantier(s)</span>
                </div>
                <div className="client-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-icon btn-small" onClick={() => setShowAddChantier(client.code)}>
                    <Plus size={16} />
                  </button>
                  <button className="btn btn-icon btn-small btn-danger" onClick={() => handleDeleteClient(client.code)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {expandedClients[client.code] && (
                <div className="client-content">
                  {showAddChantier === client.code && (
                    <div className="add-chantier-form">
                      <div className="form-row">
                        <input
                          type="text"
                          value={newChantier.code}
                          onChange={(e) => setNewChantier({ ...newChantier, code: e.target.value.toUpperCase() })}
                          placeholder="Code chantier"
                        />
                        <input
                          type="text"
                          value={newChantier.nom}
                          onChange={(e) => setNewChantier({ ...newChantier, nom: e.target.value })}
                          placeholder="Nom chantier"
                        />
                        <button className="btn btn-primary btn-small" onClick={() => handleAddChantier(client.code)}>
                          <Save size={14} />
                        </button>
                        <button className="btn btn-secondary btn-small" onClick={() => setShowAddChantier(null)}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {client.chantiers.length === 0 ? (
                    <p className="no-chantiers">Aucun chantier pour ce client</p>
                  ) : (
                    <table className="chantiers-table">
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Nom</th>
                          <th colSpan="3" className="prix-header">Prix Vente (€/kg)</th>
                          <th colSpan="3" className="cout-header">Prix Achat (€/kg)</th>
                          <th>Actions</th>
                        </tr>
                        <tr className="sub-header">
                          <th></th>
                          <th></th>
                          <th>ASS</th>
                          <th>CF</th>
                          <th>TS</th>
                          <th>ASS</th>
                          <th>CF</th>
                          <th>TS</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {client.chantiers.map(ch => (
                          <tr key={ch.code}>
                            <td className="chantier-code">{ch.code}</td>
                            <td className="chantier-nom">{ch.nom}</td>
                            <td className="prix-cell">
                              <input
                                type="number"
                                step="0.01"
                                value={ch.prixASS}
                                onChange={(e) => handleUpdatePrix(client.code, ch.code, 'prixASS', e.target.value)}
                                className="prix-input vente"
                              />
                            </td>
                            <td className="prix-cell">
                              <input
                                type="number"
                                step="0.01"
                                value={ch.prixCF}
                                onChange={(e) => handleUpdatePrix(client.code, ch.code, 'prixCF', e.target.value)}
                                className="prix-input vente"
                              />
                            </td>
                            <td className="prix-cell">
                              <input
                                type="number"
                                step="0.01"
                                value={ch.prixTS}
                                onChange={(e) => handleUpdatePrix(client.code, ch.code, 'prixTS', e.target.value)}
                                className="prix-input vente"
                              />
                            </td>
                            <td className="prix-cell">
                              <input
                                type="number"
                                step="0.01"
                                value={ch.coutASS}
                                onChange={(e) => handleUpdatePrix(client.code, ch.code, 'coutASS', e.target.value)}
                                className="prix-input achat"
                              />
                            </td>
                            <td className="prix-cell">
                              <input
                                type="number"
                                step="0.01"
                                value={ch.coutCF}
                                onChange={(e) => handleUpdatePrix(client.code, ch.code, 'coutCF', e.target.value)}
                                className="prix-input achat"
                              />
                            </td>
                            <td className="prix-cell">
                              <input
                                type="number"
                                step="0.01"
                                value={ch.coutTS}
                                onChange={(e) => handleUpdatePrix(client.code, ch.code, 'coutTS', e.target.value)}
                                className="prix-input achat"
                              />
                            </td>
                            <td className="actions-cell">
                              <button
                                className="btn btn-icon btn-small btn-danger"
                                onClick={() => handleDeleteChantier(client.code, ch.code)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
