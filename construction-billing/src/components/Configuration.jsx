import { useState } from 'react';
import { useChantier } from '../context/ChantierContext';
import { getClientsUniques } from '../utils/calculations';
import { Settings, Save, Trash2, AlertTriangle, Download, Upload, Users } from 'lucide-react';

export default function Configuration() {
  const { state, dispatch } = useChantier();
  const { config, plans, clients } = state;

  const [localConfig, setLocalConfig] = useState(config);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  const listeClients = getClientsUniques(plans);

  const handleSave = () => {
    dispatch({ type: 'UPDATE_CONFIG', payload: localConfig });
    alert('Configuration enregistrée!');
  };

  const handleSaveClientPrix = () => {
    if (editingClient) {
      dispatch({
        type: 'UPDATE_CLIENT_PRIX',
        payload: {
          codeClient: editingClient.code,
          prix: {
            prixASS: editingClient.prixASS,
            prixCF: editingClient.prixCF,
            prixTS: editingClient.prixTS
          }
        }
      });
      setEditingClient(null);
    }
  };

  const handleClearAll = () => {
    dispatch({ type: 'CLEAR_ALL' });
    setShowConfirmClear(false);
  };

  const handleExportData = () => {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chantier_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.plans && data.config) {
          dispatch({ type: 'LOAD_STATE', payload: data });
          alert('Données restaurées avec succès!');
        } else {
          alert('Format de fichier invalide');
        }
      } catch (e) {
        alert('Erreur lors de la lecture du fichier');
      }
    };
    reader.readAsText(file);
  };

  const openClientEdit = (code) => {
    const clientPrix = clients[code] || {};
    setEditingClient({
      code,
      nom: clientPrix.nom || code,
      prixASS: clientPrix.prixASS || config.prixASSDefaut,
      prixCF: clientPrix.prixCF || config.prixCFDefaut,
      prixTS: clientPrix.prixTS || config.prixTSDefaut
    });
  };

  return (
    <div className="configuration">
      <h2><Settings size={24} /> Configuration</h2>

      <div className="config-section">
        <h3>Prix de vente par défaut</h3>
        <div className="config-grid">
          <div className="config-item">
            <label>Prix ASS (€/kg)</label>
            <input
              type="number"
              step="0.01"
              value={localConfig.prixASSDefaut}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                prixASSDefaut: parseFloat(e.target.value) || 0
              })}
            />
          </div>
          <div className="config-item">
            <label>Prix CF (€/kg)</label>
            <input
              type="number"
              step="0.01"
              value={localConfig.prixCFDefaut}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                prixCFDefaut: parseFloat(e.target.value) || 0
              })}
            />
          </div>
          <div className="config-item">
            <label>Prix TS (€/m²)</label>
            <input
              type="number"
              step="0.01"
              value={localConfig.prixTSDefaut}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                prixTSDefaut: parseFloat(e.target.value) || 0
              })}
            />
          </div>
        </div>
      </div>

      <div className="config-section">
        <h3>Coûts d'achat</h3>
        <div className="config-grid">
          <div className="config-item">
            <label>Coût ASS (€/kg)</label>
            <input
              type="number"
              step="0.01"
              value={localConfig.coutASS}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                coutASS: parseFloat(e.target.value) || 0
              })}
            />
          </div>
          <div className="config-item">
            <label>Coût CF (€/kg)</label>
            <input
              type="number"
              step="0.01"
              value={localConfig.coutCF}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                coutCF: parseFloat(e.target.value) || 0
              })}
            />
          </div>
          <div className="config-item">
            <label>Coût TS (€/m²)</label>
            <input
              type="number"
              step="0.01"
              value={localConfig.coutTS}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                coutTS: parseFloat(e.target.value) || 0
              })}
            />
          </div>
        </div>
      </div>

      <div className="config-section">
        <h3>TVA</h3>
        <div className="config-grid">
          <div className="config-item">
            <label>Taux TVA (%)</label>
            <input
              type="number"
              step="0.1"
              value={localConfig.tva}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                tva: parseFloat(e.target.value) || 0
              })}
            />
          </div>
        </div>
      </div>

      <div className="config-actions">
        <button className="btn btn-primary" onClick={handleSave}>
          <Save size={18} />
          Enregistrer la configuration
        </button>
      </div>

      {listeClients.length > 0 && (
        <div className="config-section">
          <h3><Users size={20} /> Prix par client</h3>
          <p className="hint">Cliquez sur un client pour définir ses prix spécifiques</p>
          <div className="clients-list">
            {listeClients.map(client => {
              const clientPrix = clients[client.code] || {};
              return (
                <div
                  key={client.code}
                  className="client-row"
                  onClick={() => openClientEdit(client.code)}
                >
                  <span className="client-name">{client.nom || client.code}</span>
                  <span className="client-prix">
                    ASS: {clientPrix.prixASS || config.prixASSDefaut}€ |
                    CF: {clientPrix.prixCF || config.prixCFDefaut}€
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="config-section">
        <h3>Sauvegarde et restauration</h3>
        <div className="backup-actions">
          <button className="btn btn-secondary" onClick={handleExportData}>
            <Download size={18} />
            Exporter toutes les données
          </button>
          <label className="btn btn-secondary">
            <Upload size={18} />
            Importer des données
            <input
              type="file"
              accept=".json"
              onChange={handleImportData}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="config-section danger-zone">
        <h3><AlertTriangle size={20} /> Zone dangereuse</h3>
        <p>Cette action supprimera définitivement tous les plans et avancements.</p>
        <div className="stats-info">
          <span>{plans.length} plan(s) seront supprimés</span>
        </div>

        {!showConfirmClear ? (
          <button
            className="btn btn-danger"
            onClick={() => setShowConfirmClear(true)}
          >
            <Trash2 size={18} />
            Supprimer toutes les données
          </button>
        ) : (
          <div className="confirm-actions">
            <p className="warning">Êtes-vous sûr? Cette action est irréversible.</p>
            <button className="btn btn-danger" onClick={handleClearAll}>
              Confirmer la suppression
            </button>
            <button className="btn btn-secondary" onClick={() => setShowConfirmClear(false)}>
              Annuler
            </button>
          </div>
        )}
      </div>

      {editingClient && (
        <div className="modal-overlay" onClick={() => setEditingClient(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Prix pour {editingClient.nom}</h3>
            <div className="form-group">
              <label>Prix ASS (€/kg)</label>
              <input
                type="number"
                step="0.01"
                value={editingClient.prixASS}
                onChange={(e) => setEditingClient({
                  ...editingClient,
                  prixASS: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            <div className="form-group">
              <label>Prix CF (€/kg)</label>
              <input
                type="number"
                step="0.01"
                value={editingClient.prixCF}
                onChange={(e) => setEditingClient({
                  ...editingClient,
                  prixCF: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            <div className="form-group">
              <label>Prix TS (€/m²)</label>
              <input
                type="number"
                step="0.01"
                value={editingClient.prixTS}
                onChange={(e) => setEditingClient({
                  ...editingClient,
                  prixTS: parseFloat(e.target.value) || 0
                })}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleSaveClientPrix}>Enregistrer</button>
              <button className="btn btn-secondary" onClick={() => setEditingClient(null)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
