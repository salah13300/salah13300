import { useState } from 'react';
import { useChantier } from '../context/ChantierContext';
import { Settings, Save, Trash2, AlertTriangle, Download, Upload } from 'lucide-react';

export default function Configuration() {
  const { state, dispatch } = useChantier();
  const { config, plans } = state;

  const [localConfig, setLocalConfig] = useState(config);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const handleSave = () => {
    dispatch({ type: 'UPDATE_CONFIG', payload: localConfig });
    alert('Configuration enregistrée!');
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

  return (
    <div className="configuration">
      <h2><Settings size={24} /> Configuration</h2>

      <div className="config-section">
        <h3>Prix de vente</h3>
        <div className="config-grid">
          <div className="config-item">
            <label>Prix acier HA (€/kg)</label>
            <input
              type="number"
              step="0.01"
              value={localConfig.prixAcierKg}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                prixAcierKg: parseFloat(e.target.value) || 0
              })}
            />
          </div>
          <div className="config-item">
            <label>Prix treillis soudé (€/m²)</label>
            <input
              type="number"
              step="0.01"
              value={localConfig.prixTSM2}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                prixTSM2: parseFloat(e.target.value) || 0
              })}
            />
          </div>
        </div>
      </div>

      <div className="config-section">
        <h3>Prix d'achat (coûts)</h3>
        <div className="config-grid">
          <div className="config-item">
            <label>Coût acier HA (€/kg)</label>
            <input
              type="number"
              step="0.01"
              value={localConfig.prixAchatKg}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                prixAchatKg: parseFloat(e.target.value) || 0
              })}
            />
          </div>
          <div className="config-item">
            <label>Coût treillis soudé (€/m²)</label>
            <input
              type="number"
              step="0.01"
              value={localConfig.prixAchatTSM2}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                prixAchatTSM2: parseFloat(e.target.value) || 0
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
    </div>
  );
}
