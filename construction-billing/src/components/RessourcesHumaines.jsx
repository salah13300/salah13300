import { useState, useMemo } from 'react';
import { useChantier } from '../context/ChantierContext';
import { formatEuros, formatNumber, getClientsUniques, getChantiersParClient, getAllChantiers } from '../utils/calculations';
import { Users, Plus, Trash2, Edit2, Save, X, FileDown, UserPlus, Building, Calendar, Car, Receipt, AlertCircle, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function RessourcesHumaines() {
  const { state, dispatch } = useChantier();
  const { plans, salaries, affectations, notesFrais, currentMonth, config } = state;

  const [activeTab, setActiveTab] = useState('salaries'); // salaries, affectations, notesFrais, debours
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterChantier, setFilterChantier] = useState('');
  const [filterMois, setFilterMois] = useState(currentMonth);
  const [formError, setFormError] = useState('');

  // Formulaires
  const [salarieForm, setSalarieForm] = useState({
    nom: '', prenom: '', fonction: '', tauxHoraire: 0, email: '', telephone: ''
  });

  const [affectationForm, setAffectationForm] = useState({
    salariesIds: [], // Multiple salariés
    codeChantier: '', mois: currentMonth, heures: 0, fraisKm: 0
  });

  const [noteFraisForm, setNoteFraisForm] = useState({
    salarieId: '', codeChantier: '', mois: currentMonth, description: '', montant: 0, type: 'deplacement'
  });

  const chantiers = useMemo(() => getAllChantiers(plans), [plans]);

  // Calcul des débours par chantier
  const deboursParChantier = useMemo(() => {
    const result = {};

    chantiers.forEach(ch => {
      result[ch.code] = {
        chantier: ch,
        salaires: 0,
        charges: 0,
        fraisKm: 0,
        notesFrais: 0,
        total: 0
      };
    });

    // Calcul des salaires et frais km
    affectations.filter(a => !filterMois || a.mois === filterMois).forEach(aff => {
      const salarie = salaries.find(s => s.id === aff.salarieId);
      if (salarie && result[aff.codeChantier]) {
        const coutSalaire = aff.heures * salarie.tauxHoraire;
        const charges = coutSalaire * (config.tauxChargesPatronales / 100);
        const fraisKm = aff.fraisKm * config.tauxFraisKm;

        result[aff.codeChantier].salaires += coutSalaire;
        result[aff.codeChantier].charges += charges;
        result[aff.codeChantier].fraisKm += fraisKm;
      }
    });

    // Calcul des notes de frais
    notesFrais.filter(n => !filterMois || n.mois === filterMois).forEach(ndf => {
      if (result[ndf.codeChantier]) {
        result[ndf.codeChantier].notesFrais += ndf.montant;
      }
    });

    // Calcul total
    Object.values(result).forEach(ch => {
      ch.total = ch.salaires + ch.charges + ch.fraisKm + ch.notesFrais;
    });

    return result;
  }, [chantiers, affectations, notesFrais, salaries, config, filterMois]);

  // Total général
  const totalDebours = useMemo(() => {
    return Object.values(deboursParChantier).reduce((acc, ch) => ({
      salaires: acc.salaires + ch.salaires,
      charges: acc.charges + ch.charges,
      fraisKm: acc.fraisKm + ch.fraisKm,
      notesFrais: acc.notesFrais + ch.notesFrais,
      total: acc.total + ch.total
    }), { salaires: 0, charges: 0, fraisKm: 0, notesFrais: 0, total: 0 });
  }, [deboursParChantier]);

  // Handlers
  const handleAddSalarie = () => {
    if (!salarieForm.nom || !salarieForm.prenom) return;

    if (editingId) {
      dispatch({ type: 'UPDATE_SALARIE', payload: { id: editingId, ...salarieForm } });
    } else {
      dispatch({ type: 'ADD_SALARIE', payload: salarieForm });
    }
    resetSalarieForm();
  };

  const handleAddAffectation = () => {
    setFormError('');

    if (editingId) {
      // Mode édition: un seul salarié
      const salarieId = affectationForm.salariesIds[0] || affectationForm.salarieId;
      if (!salarieId || !affectationForm.codeChantier) {
        setFormError('Veuillez sélectionner un salarié et un chantier');
        return;
      }
      dispatch({ type: 'UPDATE_AFFECTATION', payload: { id: editingId, salarieId, codeChantier: affectationForm.codeChantier, mois: affectationForm.mois, heures: affectationForm.heures, fraisKm: affectationForm.fraisKm } });
    } else {
      // Mode création: plusieurs salariés possibles
      if (affectationForm.salariesIds.length === 0 || !affectationForm.codeChantier) {
        setFormError('Veuillez sélectionner au moins un salarié et un chantier');
        return;
      }
      // Créer une affectation pour chaque salarié sélectionné
      affectationForm.salariesIds.forEach(salarieId => {
        dispatch({ type: 'ADD_AFFECTATION', payload: { salarieId, codeChantier: affectationForm.codeChantier, mois: affectationForm.mois, heures: affectationForm.heures, fraisKm: affectationForm.fraisKm } });
      });
    }
    resetAffectationForm();
  };

  const handleAddNoteFrais = () => {
    setFormError('');

    if (!noteFraisForm.salarieId) {
      setFormError('Veuillez sélectionner un salarié');
      return;
    }
    if (!noteFraisForm.description) {
      setFormError('Veuillez entrer une description');
      return;
    }

    if (editingId) {
      dispatch({ type: 'UPDATE_NOTE_FRAIS', payload: { id: editingId, ...noteFraisForm } });
    } else {
      dispatch({ type: 'ADD_NOTE_FRAIS', payload: noteFraisForm });
    }
    resetNoteFraisForm();
  };

  const resetSalarieForm = () => {
    setSalarieForm({ nom: '', prenom: '', fonction: '', tauxHoraire: 0, email: '', telephone: '' });
    setShowForm(false);
    setEditingId(null);
    setFormError('');
  };

  const resetAffectationForm = () => {
    setAffectationForm({ salariesIds: [], codeChantier: '', mois: currentMonth, heures: 0, fraisKm: 0 });
    setShowForm(false);
    setEditingId(null);
    setFormError('');
  };

  const resetNoteFraisForm = () => {
    setNoteFraisForm({ salarieId: '', codeChantier: '', mois: currentMonth, description: '', montant: 0, type: 'deplacement' });
    setShowForm(false);
    setEditingId(null);
    setFormError('');
  };

  const editSalarie = (s) => {
    setSalarieForm({ nom: s.nom, prenom: s.prenom, fonction: s.fonction, tauxHoraire: s.tauxHoraire, email: s.email || '', telephone: s.telephone || '' });
    setEditingId(s.id);
    setShowForm(true);
  };

  const editAffectation = (a) => {
    setAffectationForm({ salariesIds: [a.salarieId], salarieId: a.salarieId, codeChantier: a.codeChantier, mois: a.mois, heures: a.heures, fraisKm: a.fraisKm || 0 });
    setEditingId(a.id);
    setShowForm(true);
    setFormError('');
  };

  const editNoteFrais = (n) => {
    setNoteFraisForm({ salarieId: n.salarieId, codeChantier: n.codeChantier, mois: n.mois, description: n.description, montant: n.montant, type: n.type });
    setEditingId(n.id);
    setShowForm(true);
  };

  const exportDebours = () => {
    const data = Object.values(deboursParChantier)
      .filter(d => d.total > 0)
      .map(d => ({
        'Chantier': d.chantier.nom || d.chantier.code,
        'Client': d.chantier.nomClient,
        'Salaires': d.salaires,
        'Charges patronales': d.charges,
        'Frais km': d.fraisKm,
        'Notes de frais': d.notesFrais,
        'Total': d.total
      }));

    data.push({});
    data.push({
      'Chantier': 'TOTAL',
      'Salaires': totalDebours.salaires,
      'Charges patronales': totalDebours.charges,
      'Frais km': totalDebours.fraisKm,
      'Notes de frais': totalDebours.notesFrais,
      'Total': totalDebours.total
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Débours RH');
    XLSX.writeFile(wb, `debours_rh_${filterMois || 'tous'}.xlsx`);
  };

  const getSalarieName = (id) => {
    const s = salaries.find(s => s.id === id);
    return s ? `${s.prenom} ${s.nom}` : 'Inconnu';
  };

  const getChantierName = (code) => {
    const ch = chantiers.find(c => c.code === code);
    return ch ? (ch.nom || ch.code) : code;
  };

  return (
    <div className="ressources-humaines">
      <div className="rh-header">
        <h2><Users size={24} /> Ressources Humaines</h2>

        <div className="rh-tabs">
          <button
            className={`tab-btn ${activeTab === 'salaries' ? 'active' : ''}`}
            onClick={() => { setActiveTab('salaries'); setShowForm(false); }}
          >
            <UserPlus size={16} /> Salariés
          </button>
          <button
            className={`tab-btn ${activeTab === 'affectations' ? 'active' : ''}`}
            onClick={() => { setActiveTab('affectations'); setShowForm(false); }}
          >
            <Building size={16} /> Affectations
          </button>
          <button
            className={`tab-btn ${activeTab === 'notesFrais' ? 'active' : ''}`}
            onClick={() => { setActiveTab('notesFrais'); setShowForm(false); }}
          >
            <Receipt size={16} /> Notes de frais
          </button>
          <button
            className={`tab-btn ${activeTab === 'debours' ? 'active' : ''}`}
            onClick={() => { setActiveTab('debours'); setShowForm(false); }}
          >
            <Car size={16} /> Débours
          </button>
        </div>
      </div>

      {/* Filtres pour affectations, notes de frais et débours */}
      {(activeTab === 'affectations' || activeTab === 'notesFrais' || activeTab === 'debours') && (
        <div className="filters-row">
          <div className="filter-group">
            <Calendar size={18} />
            <input
              type="month"
              value={filterMois}
              onChange={(e) => setFilterMois(e.target.value)}
            />
          </div>
          {activeTab !== 'debours' && (
            <div className="filter-group">
              <Building size={18} />
              <select value={filterChantier} onChange={(e) => setFilterChantier(e.target.value)}>
                <option value="">Tous les chantiers</option>
                {chantiers.map(ch => (
                  <option key={ch.code} value={ch.code}>{ch.nom || ch.code}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Onglet Salariés */}
      {activeTab === 'salaries' && (
        <div className="tab-content">
          <div className="tab-actions">
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={18} /> Ajouter un salarié
            </button>
          </div>

          {showForm && (
            <div className="form-card">
              <h3>{editingId ? 'Modifier salarié' : 'Nouveau salarié'}</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom *</label>
                  <input type="text" value={salarieForm.nom} onChange={(e) => setSalarieForm({ ...salarieForm, nom: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Prénom *</label>
                  <input type="text" value={salarieForm.prenom} onChange={(e) => setSalarieForm({ ...salarieForm, prenom: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Fonction</label>
                  <select value={salarieForm.fonction} onChange={(e) => setSalarieForm({ ...salarieForm, fonction: e.target.value })}>
                    <option value="">Sélectionner</option>
                    <option value="conducteur">Conducteur de travaux</option>
                    <option value="chef_equipe">Chef d'équipe</option>
                    <option value="ouvrier">Ouvrier</option>
                    <option value="admin">Administratif</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Taux horaire (€)</label>
                  <input type="number" step="0.01" value={salarieForm.tauxHoraire} onChange={(e) => setSalarieForm({ ...salarieForm, tauxHoraire: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={salarieForm.email} onChange={(e) => setSalarieForm({ ...salarieForm, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Téléphone</label>
                  <input type="tel" value={salarieForm.telephone} onChange={(e) => setSalarieForm({ ...salarieForm, telephone: e.target.value })} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={resetSalarieForm}>Annuler</button>
                <button className="btn btn-primary" onClick={handleAddSalarie}>
                  <Save size={18} /> {editingId ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </div>
          )}

          <table className="rh-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Prénom</th>
                <th>Fonction</th>
                <th>Taux horaire</th>
                <th>Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salaries.map(s => (
                <tr key={s.id}>
                  <td>{s.nom}</td>
                  <td>{s.prenom}</td>
                  <td>{s.fonction === 'conducteur' ? 'Conducteur de travaux' : s.fonction === 'chef_equipe' ? 'Chef d\'équipe' : s.fonction === 'ouvrier' ? 'Ouvrier' : s.fonction === 'admin' ? 'Administratif' : s.fonction}</td>
                  <td className="amount">{formatEuros(s.tauxHoraire)}/h</td>
                  <td>{s.email || s.telephone || '-'}</td>
                  <td className="actions">
                    <button className="btn btn-icon" onClick={() => editSalarie(s)}><Edit2 size={16} /></button>
                    <button className="btn btn-icon btn-danger" onClick={() => dispatch({ type: 'DELETE_SALARIE', payload: s.id })}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {salaries.length === 0 && (
                <tr><td colSpan="6" className="empty">Aucun salarié enregistré</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Onglet Affectations */}
      {activeTab === 'affectations' && (
        <div className="tab-content">
          <div className="tab-actions">
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={18} /> Nouvelle affectation
            </button>
          </div>

          {showForm && (
            <div className="form-card">
              <h3>{editingId ? 'Modifier affectation' : 'Nouvelle affectation'}</h3>
              {formError && (
                <div className="form-error">
                  <AlertCircle size={16} /> {formError}
                </div>
              )}
              {salaries.length === 0 && (
                <div className="form-warning">
                  <AlertCircle size={16} /> Aucun salarié enregistré. Veuillez d'abord ajouter des salariés dans l'onglet "Salariés".
                </div>
              )}
              {chantiers.length === 0 && (
                <div className="form-warning">
                  <AlertCircle size={16} /> Aucun chantier disponible. Veuillez d'abord importer des plans.
                </div>
              )}
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>{editingId ? 'Salarié *' : 'Salariés * (sélection multiple avec Ctrl+clic)'}</label>
                  {editingId ? (
                    <select
                      value={affectationForm.salariesIds[0] || ''}
                      onChange={(e) => setAffectationForm({ ...affectationForm, salariesIds: [e.target.value] })}
                    >
                      <option value="">Sélectionner</option>
                      {salaries.map(s => (
                        <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      multiple
                      size={Math.min(salaries.length + 1, 6)}
                      value={affectationForm.salariesIds}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                        setAffectationForm({ ...affectationForm, salariesIds: selected });
                      }}
                      className="multi-select"
                    >
                      {salaries.map(s => (
                        <option key={s.id} value={s.id}>{s.prenom} {s.nom} ({s.fonction || 'N/A'})</option>
                      ))}
                    </select>
                  )}
                  {!editingId && affectationForm.salariesIds.length > 0 && (
                    <small className="selected-count">{affectationForm.salariesIds.length} salarié(s) sélectionné(s)</small>
                  )}
                </div>
                <div className="form-group">
                  <label>Chantier *</label>
                  <select value={affectationForm.codeChantier} onChange={(e) => setAffectationForm({ ...affectationForm, codeChantier: e.target.value })}>
                    <option value="">Sélectionner</option>
                    {chantiers.map(ch => (
                      <option key={ch.code} value={ch.code}>{ch.nom || ch.code} - {ch.nomClient}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Mois</label>
                  <input type="month" value={affectationForm.mois} onChange={(e) => setAffectationForm({ ...affectationForm, mois: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Heures travaillées</label>
                  <input type="number" value={affectationForm.heures} onChange={(e) => setAffectationForm({ ...affectationForm, heures: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Km parcourus</label>
                  <input type="number" value={affectationForm.fraisKm} onChange={(e) => setAffectationForm({ ...affectationForm, fraisKm: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={resetAffectationForm}>Annuler</button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddAffectation}
                  disabled={salaries.length === 0 || chantiers.length === 0}
                >
                  <Save size={18} /> {editingId ? 'Modifier' : `Ajouter ${affectationForm.salariesIds.length > 1 ? `(${affectationForm.salariesIds.length})` : ''}`}
                </button>
              </div>
            </div>
          )}

          <table className="rh-table">
            <thead>
              <tr>
                <th>Mois</th>
                <th>Salarié</th>
                <th>Chantier</th>
                <th>Heures</th>
                <th>Coût salarial</th>
                <th>Km</th>
                <th>Frais km</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {affectations
                .filter(a => (!filterMois || a.mois === filterMois) && (!filterChantier || a.codeChantier === filterChantier))
                .map(a => {
                  const salarie = salaries.find(s => s.id === a.salarieId);
                  const coutSalaire = salarie ? a.heures * salarie.tauxHoraire : 0;
                  const charges = coutSalaire * (config.tauxChargesPatronales / 100);
                  const fraisKm = (a.fraisKm || 0) * config.tauxFraisKm;
                  const total = coutSalaire + charges + fraisKm;

                  return (
                    <tr key={a.id}>
                      <td>{a.mois}</td>
                      <td>{getSalarieName(a.salarieId)}</td>
                      <td>{getChantierName(a.codeChantier)}</td>
                      <td className="amount">{formatNumber(a.heures, 1)}h</td>
                      <td className="amount">{formatEuros(coutSalaire + charges)}</td>
                      <td className="amount">{formatNumber(a.fraisKm || 0, 0)} km</td>
                      <td className="amount">{formatEuros(fraisKm)}</td>
                      <td className="amount"><strong>{formatEuros(total)}</strong></td>
                      <td className="actions">
                        <button className="btn btn-icon" onClick={() => editAffectation(a)}><Edit2 size={16} /></button>
                        <button className="btn btn-icon btn-danger" onClick={() => dispatch({ type: 'DELETE_AFFECTATION', payload: a.id })}><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  );
                })}
              {affectations.filter(a => (!filterMois || a.mois === filterMois) && (!filterChantier || a.codeChantier === filterChantier)).length === 0 && (
                <tr><td colSpan="9" className="empty">Aucune affectation pour cette période</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Onglet Notes de frais */}
      {activeTab === 'notesFrais' && (
        <div className="tab-content">
          <div className="tab-actions">
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={18} /> Nouvelle note de frais
            </button>
          </div>

          {showForm && (
            <div className="form-card">
              <h3>{editingId ? 'Modifier note de frais' : 'Nouvelle note de frais'}</h3>
              {formError && (
                <div className="form-error">
                  <AlertCircle size={16} /> {formError}
                </div>
              )}
              {salaries.length === 0 && (
                <div className="form-warning">
                  <AlertCircle size={16} /> Aucun salarié enregistré. Veuillez d'abord ajouter des salariés dans l'onglet "Salariés".
                </div>
              )}
              <div className="form-grid">
                <div className="form-group">
                  <label>Salarié *</label>
                  <select value={noteFraisForm.salarieId} onChange={(e) => setNoteFraisForm({ ...noteFraisForm, salarieId: e.target.value })}>
                    <option value="">Sélectionner</option>
                    {salaries.map(s => (
                      <option key={s.id} value={s.id}>{s.prenom} {s.nom}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Chantier</label>
                  <select value={noteFraisForm.codeChantier} onChange={(e) => setNoteFraisForm({ ...noteFraisForm, codeChantier: e.target.value })}>
                    <option value="">Général (non affecté)</option>
                    {chantiers.map(ch => (
                      <option key={ch.code} value={ch.code}>{ch.nom || ch.code} - {ch.nomClient}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Mois</label>
                  <input type="month" value={noteFraisForm.mois} onChange={(e) => setNoteFraisForm({ ...noteFraisForm, mois: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select value={noteFraisForm.type} onChange={(e) => setNoteFraisForm({ ...noteFraisForm, type: e.target.value })}>
                    <option value="deplacement">Déplacement</option>
                    <option value="repas">Repas</option>
                    <option value="hebergement">Hébergement</option>
                    <option value="materiel">Matériel</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Description *</label>
                  <input type="text" value={noteFraisForm.description} onChange={(e) => setNoteFraisForm({ ...noteFraisForm, description: e.target.value })} placeholder="Ex: Frais péage autoroute" />
                </div>
                <div className="form-group">
                  <label>Montant (€)</label>
                  <input type="number" step="0.01" value={noteFraisForm.montant} onChange={(e) => setNoteFraisForm({ ...noteFraisForm, montant: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="form-actions">
                <button className="btn btn-secondary" onClick={resetNoteFraisForm}>Annuler</button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddNoteFrais}
                  disabled={salaries.length === 0}
                >
                  <Save size={18} /> {editingId ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </div>
          )}

          <table className="rh-table">
            <thead>
              <tr>
                <th>Mois</th>
                <th>Salarié</th>
                <th>Chantier</th>
                <th>Type</th>
                <th>Description</th>
                <th>Montant</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {notesFrais
                .filter(n => (!filterMois || n.mois === filterMois) && (!filterChantier || n.codeChantier === filterChantier))
                .map(n => (
                  <tr key={n.id}>
                    <td>{n.mois}</td>
                    <td>{getSalarieName(n.salarieId)}</td>
                    <td>{n.codeChantier ? getChantierName(n.codeChantier) : 'Général'}</td>
                    <td><span className={`badge badge-${n.type}`}>{n.type}</span></td>
                    <td>{n.description}</td>
                    <td className="amount">{formatEuros(n.montant)}</td>
                    <td className="actions">
                      <button className="btn btn-icon" onClick={() => editNoteFrais(n)}><Edit2 size={16} /></button>
                      <button className="btn btn-icon btn-danger" onClick={() => dispatch({ type: 'DELETE_NOTE_FRAIS', payload: n.id })}><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              {notesFrais.filter(n => (!filterMois || n.mois === filterMois) && (!filterChantier || n.codeChantier === filterChantier)).length === 0 && (
                <tr><td colSpan="7" className="empty">Aucune note de frais pour cette période</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Onglet Débours */}
      {activeTab === 'debours' && (
        <div className="tab-content">
          <div className="tab-actions">
            <button className="btn btn-secondary" onClick={exportDebours}>
              <FileDown size={18} /> Export Excel
            </button>
          </div>

          <div className="debours-summary">
            <div className="summary-card">
              <span className="summary-label">Total Salaires</span>
              <span className="summary-value">{formatEuros(totalDebours.salaires)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Charges</span>
              <span className="summary-value">{formatEuros(totalDebours.charges)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Frais km</span>
              <span className="summary-value">{formatEuros(totalDebours.fraisKm)}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Total Notes de frais</span>
              <span className="summary-value">{formatEuros(totalDebours.notesFrais)}</span>
            </div>
            <div className="summary-card large">
              <span className="summary-label">TOTAL DÉBOURS RH</span>
              <span className="summary-value">{formatEuros(totalDebours.total)}</span>
            </div>
          </div>

          <table className="rh-table">
            <thead>
              <tr>
                <th>Chantier</th>
                <th>Client</th>
                <th>Salaires</th>
                <th>Charges ({config.tauxChargesPatronales}%)</th>
                <th>Frais km</th>
                <th>Notes de frais</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(deboursParChantier)
                .filter(d => d.total > 0)
                .sort((a, b) => b.total - a.total)
                .map(d => (
                  <tr key={d.chantier.code}>
                    <td><strong>{d.chantier.nom || d.chantier.code}</strong></td>
                    <td>{d.chantier.nomClient}</td>
                    <td className="amount">{formatEuros(d.salaires)}</td>
                    <td className="amount">{formatEuros(d.charges)}</td>
                    <td className="amount">{formatEuros(d.fraisKm)}</td>
                    <td className="amount">{formatEuros(d.notesFrais)}</td>
                    <td className="amount"><strong>{formatEuros(d.total)}</strong></td>
                  </tr>
                ))}
              {Object.values(deboursParChantier).filter(d => d.total > 0).length === 0 && (
                <tr><td colSpan="7" className="empty">Aucun débours enregistré</td></tr>
              )}
            </tbody>
            {Object.values(deboursParChantier).filter(d => d.total > 0).length > 0 && (
              <tfoot>
                <tr className="total">
                  <td colSpan="2"><strong>TOTAL</strong></td>
                  <td className="amount"><strong>{formatEuros(totalDebours.salaires)}</strong></td>
                  <td className="amount"><strong>{formatEuros(totalDebours.charges)}</strong></td>
                  <td className="amount"><strong>{formatEuros(totalDebours.fraisKm)}</strong></td>
                  <td className="amount"><strong>{formatEuros(totalDebours.notesFrais)}</strong></td>
                  <td className="amount"><strong>{formatEuros(totalDebours.total)}</strong></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
