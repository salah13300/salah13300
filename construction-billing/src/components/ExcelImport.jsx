import { useState, useRef } from 'react';
import { useChantier } from '../context/ChantierContext';
import { parseExcelFile, generateTemplate } from '../utils/excelParser';
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';

export default function ExcelImport() {
  const { dispatch } = useChantier();
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setResult({ success: false, message: 'Veuillez sélectionner un fichier Excel (.xlsx ou .xls)' });
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const plans = await parseExcelFile(file);
      setPreview(plans);
      setResult({
        success: true,
        message: `${plans.length} plan(s) trouvé(s) dans le fichier. Vérifiez l'aperçu ci-dessous.`
      });
    } catch (error) {
      setResult({ success: false, message: error.message });
      setPreview(null);
    } finally {
      setImporting(false);
    }
  };

  const confirmImport = () => {
    if (preview && preview.length > 0) {
      dispatch({ type: 'ADD_PLANS', payload: preview });
      setResult({
        success: true,
        message: `${preview.length} plan(s) importé(s) avec succès!`
      });
      setPreview(null);
    }
  };

  const cancelImport = () => {
    setPreview(null);
    setResult(null);
  };

  return (
    <div className="excel-import">
      <h2>Import de Fichier Excel</h2>

      <div className="import-actions">
        <button className="btn btn-secondary" onClick={generateTemplate}>
          <Download size={18} />
          Télécharger le template
        </button>
      </div>

      <div
        className={`drop-zone ${dragActive ? 'active' : ''} ${importing ? 'importing' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        {importing ? (
          <div className="drop-content">
            <div className="spinner"></div>
            <p>Analyse du fichier en cours...</p>
          </div>
        ) : (
          <div className="drop-content">
            <Upload size={48} />
            <p>Glissez-déposez un fichier Excel ici</p>
            <p className="drop-hint">ou cliquez pour sélectionner</p>
          </div>
        )}
      </div>

      {result && (
        <div className={`result-message ${result.success ? 'success' : 'error'}`}>
          {result.success ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{result.message}</span>
        </div>
      )}

      {preview && preview.length > 0 && (
        <div className="preview-section">
          <h3>Aperçu des plans à importer</h3>
          <div className="preview-table-container">
            <table className="preview-table">
              <thead>
                <tr>
                  <th>N° Plan</th>
                  <th>Désignation</th>
                  <th>Type</th>
                  <th>Poids (kg)</th>
                  <th>Surface (m²)</th>
                  <th>Date Livraison</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((plan, index) => (
                  <tr key={index}>
                    <td>{plan.numeroPlan}</td>
                    <td>{plan.designation}</td>
                    <td><span className={`type-badge ${plan.type.toLowerCase()}`}>{plan.type}</span></td>
                    <td>{plan.poidsKg || '-'}</td>
                    <td>{plan.surfaceM2 || '-'}</td>
                    <td>{plan.dateLivraison}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 10 && (
              <p className="preview-more">... et {preview.length - 10} autre(s) plan(s)</p>
            )}
          </div>

          <div className="preview-actions">
            <button className="btn btn-primary" onClick={confirmImport}>
              <CheckCircle size={18} />
              Confirmer l'import
            </button>
            <button className="btn btn-secondary" onClick={cancelImport}>
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="import-help">
        <h3><FileSpreadsheet size={20} /> Format attendu du fichier Excel</h3>
        <p>Le fichier Excel doit contenir les colonnes suivantes :</p>
        <ul>
          <li><strong>Numéro Plan</strong> ou <strong>N° Plan</strong> : Identifiant unique du plan</li>
          <li><strong>Désignation</strong> ou <strong>Description</strong> : Description du plan</li>
          <li><strong>Type</strong> : HA (acier) ou TS (treillis soudé)</li>
          <li><strong>Poids (kg)</strong> : Pour les plans HA</li>
          <li><strong>Surface (m²)</strong> : Pour les plans TS</li>
          <li><strong>Date Livraison</strong> : Date de livraison prévue</li>
        </ul>
      </div>
    </div>
  );
}
