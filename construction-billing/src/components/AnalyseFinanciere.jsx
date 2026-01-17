import { useState, useMemo } from 'react';
import { useChantier } from '../context/ChantierContext';
import {
  calculerStatistiquesGlobales,
  calculerMontantsPlan,
  formatEuros,
  formatNumber,
  getClientsUniques,
  getAllChantiers
} from '../utils/calculations';
import { BarChart3, TrendingUp, TrendingDown, Building, Users, FileDown, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AnalyseFinanciere() {
  const { state } = useChantier();
  const { plans, clients, salaries, affectations, notesFrais, config } = state;

  const [filterMois, setFilterMois] = useState('');
  const [viewMode, setViewMode] = useState('chantiers'); // chantiers, clients, global

  const stats = useMemo(
    () => calculerStatistiquesGlobales(plans, clients, config),
    [plans, clients, config]
  );

  const listeClients = useMemo(() => getClientsUniques(plans), [plans]);
  const chantiers = useMemo(() => getAllChantiers(plans), [plans]);

  // Calcul des débours RH par chantier
  const deboursRHParChantier = useMemo(() => {
    const result = {};

    chantiers.forEach(ch => {
      result[ch.code] = { salaires: 0, charges: 0, fraisKm: 0, notesFrais: 0, total: 0 };
    });

    affectations.filter(a => !filterMois || a.mois === filterMois).forEach(aff => {
      const salarie = salaries.find(s => s.id === aff.salarieId);
      if (salarie && result[aff.codeChantier]) {
        const coutSalaire = aff.heures * salarie.tauxHoraire;
        const charges = coutSalaire * (config.tauxChargesPatronales / 100);
        const fraisKm = (aff.fraisKm || 0) * config.tauxFraisKm;

        result[aff.codeChantier].salaires += coutSalaire;
        result[aff.codeChantier].charges += charges;
        result[aff.codeChantier].fraisKm += fraisKm;
      }
    });

    notesFrais.filter(n => !filterMois || n.mois === filterMois).forEach(ndf => {
      if (result[ndf.codeChantier]) {
        result[ndf.codeChantier].notesFrais += ndf.montant;
      }
    });

    Object.values(result).forEach(ch => {
      ch.total = ch.salaires + ch.charges + ch.fraisKm + ch.notesFrais;
    });

    return result;
  }, [chantiers, affectations, notesFrais, salaries, config, filterMois]);

  // Débours matière par chantier
  const deboursMatiereParChantier = useMemo(() => {
    const result = {};

    chantiers.forEach(ch => {
      result[ch.code] = {
        chantier: ch,
        vente: 0,
        achat: 0,
        marge: 0,
        nbPlans: 0
      };
    });

    plans.forEach(plan => {
      if (result[plan.codeChantier]) {
        const montants = calculerMontantsPlan(plan, clients, config);
        result[plan.codeChantier].vente += montants.montantTotal;
        result[plan.codeChantier].achat += montants.coutTotal;
        result[plan.codeChantier].nbPlans++;
      }
    });

    Object.values(result).forEach(ch => {
      ch.marge = ch.vente - ch.achat;
    });

    return result;
  }, [plans, clients, config, chantiers]);

  // Débours total par chantier (matière + RH)
  const deboursParChantier = useMemo(() => {
    return chantiers.map(ch => {
      const matiere = deboursMatiereParChantier[ch.code] || { vente: 0, achat: 0, marge: 0, nbPlans: 0 };
      const rh = deboursRHParChantier[ch.code] || { total: 0 };

      return {
        chantier: ch,
        vente: matiere.vente,
        coutMatiere: matiere.achat,
        coutRH: rh.total,
        coutTotal: matiere.achat + rh.total,
        marge: matiere.vente - matiere.achat - rh.total,
        margePercent: matiere.vente > 0 ? ((matiere.vente - matiere.achat - rh.total) / matiere.vente) * 100 : 0,
        nbPlans: matiere.nbPlans
      };
    }).filter(d => d.vente > 0 || d.coutTotal > 0).sort((a, b) => b.marge - a.marge);
  }, [chantiers, deboursMatiereParChantier, deboursRHParChantier]);

  // Débours par client
  const deboursParClient = useMemo(() => {
    const clientsData = {};

    listeClients.forEach(client => {
      clientsData[client.code] = {
        client,
        vente: 0,
        coutMatiere: 0,
        coutRH: 0,
        coutTotal: 0,
        marge: 0,
        nbChantiers: 0
      };
    });

    deboursParChantier.forEach(d => {
      const codeClient = d.chantier.codeClient;
      if (clientsData[codeClient]) {
        clientsData[codeClient].vente += d.vente;
        clientsData[codeClient].coutMatiere += d.coutMatiere;
        clientsData[codeClient].coutRH += d.coutRH;
        clientsData[codeClient].coutTotal += d.coutTotal;
        clientsData[codeClient].marge += d.marge;
        clientsData[codeClient].nbChantiers++;
      }
    });

    return Object.values(clientsData)
      .filter(c => c.vente > 0 || c.coutTotal > 0)
      .map(c => ({
        ...c,
        margePercent: c.vente > 0 ? (c.marge / c.vente) * 100 : 0
      }))
      .sort((a, b) => b.marge - a.marge);
  }, [listeClients, deboursParChantier]);

  // Totaux globaux
  const totaux = useMemo(() => {
    return deboursParChantier.reduce((acc, d) => ({
      vente: acc.vente + d.vente,
      coutMatiere: acc.coutMatiere + d.coutMatiere,
      coutRH: acc.coutRH + d.coutRH,
      coutTotal: acc.coutTotal + d.coutTotal,
      marge: acc.marge + d.marge
    }), { vente: 0, coutMatiere: 0, coutRH: 0, coutTotal: 0, marge: 0 });
  }, [deboursParChantier]);

  const exportDebours = () => {
    const data = viewMode === 'chantiers'
      ? deboursParChantier.map(d => ({
          'Chantier': d.chantier.nom || d.chantier.code,
          'Client': d.chantier.nomClient,
          'CA Vente HT': d.vente,
          'Coût Matière': d.coutMatiere,
          'Coût RH': d.coutRH,
          'Coût Total': d.coutTotal,
          'Marge €': d.marge,
          'Marge %': d.margePercent.toFixed(1) + '%'
        }))
      : deboursParClient.map(d => ({
          'Client': d.client.nom || d.client.code,
          'Nb Chantiers': d.nbChantiers,
          'CA Vente HT': d.vente,
          'Coût Matière': d.coutMatiere,
          'Coût RH': d.coutRH,
          'Coût Total': d.coutTotal,
          'Marge €': d.marge,
          'Marge %': d.margePercent.toFixed(1) + '%'
        }));

    data.push({});
    data.push({
      [viewMode === 'chantiers' ? 'Chantier' : 'Client']: 'TOTAL',
      'CA Vente HT': totaux.vente,
      'Coût Matière': totaux.coutMatiere,
      'Coût RH': totaux.coutRH,
      'Coût Total': totaux.coutTotal,
      'Marge €': totaux.marge,
      'Marge %': totaux.vente > 0 ? ((totaux.marge / totaux.vente) * 100).toFixed(1) + '%' : '0%'
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Débours');
    XLSX.writeFile(wb, `debours_${viewMode}_${filterMois || 'tous'}.xlsx`);
  };

  return (
    <div className="analyse-financiere">
      <div className="analyse-header">
        <h2><BarChart3 size={24} /> Analyse Financière - Débours</h2>

        <div className="analyse-controls">
          <div className="filter-group">
            <Calendar size={18} />
            <input
              type="month"
              value={filterMois}
              onChange={(e) => setFilterMois(e.target.value)}
              placeholder="Tous les mois"
            />
            {filterMois && (
              <button className="btn btn-icon" onClick={() => setFilterMois('')}>×</button>
            )}
          </div>

          <div className="view-toggle">
            <button
              className={`btn ${viewMode === 'chantiers' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('chantiers')}
            >
              <Building size={16} /> Par Chantier
            </button>
            <button
              className={`btn ${viewMode === 'clients' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewMode('clients')}
            >
              <Users size={16} /> Par Client
            </button>
          </div>

          <button className="btn btn-secondary" onClick={exportDebours}>
            <FileDown size={18} /> Export Excel
          </button>
        </div>
      </div>

      {/* Résumé global */}
      <div className="analyse-summary">
        <div className="summary-card large">
          <div className="summary-icon">
            <BarChart3 size={32} />
          </div>
          <div className="summary-content">
            <span className="summary-value">{formatEuros(totaux.vente)}</span>
            <span className="summary-label">CA Vente HT</span>
          </div>
        </div>

        <div className="summary-card large">
          <div className="summary-icon negative">
            <TrendingDown size={32} />
          </div>
          <div className="summary-content">
            <span className="summary-value">{formatEuros(totaux.coutTotal)}</span>
            <span className="summary-label">Coûts totaux (Matière + RH)</span>
          </div>
        </div>

        <div className={`summary-card large ${totaux.marge >= 0 ? 'positive' : 'negative'}`}>
          <div className="summary-icon">
            {totaux.marge >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
          </div>
          <div className="summary-content">
            <span className={`summary-value ${totaux.marge >= 0 ? 'positive' : 'negative'}`}>
              {formatEuros(totaux.marge)}
            </span>
            <span className="summary-label">
              Marge ({totaux.vente > 0 ? formatNumber((totaux.marge / totaux.vente) * 100, 1) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Détail des coûts */}
      <div className="costs-breakdown">
        <div className="summary-card">
          <span className="summary-label">Coût Matière</span>
          <span className="summary-value">{formatEuros(totaux.coutMatiere)}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Coût RH</span>
          <span className="summary-value">{formatEuros(totaux.coutRH)}</span>
        </div>
      </div>

      {/* Tableau par chantier ou par client */}
      <div className="analyse-table">
        <h3>Débours {viewMode === 'chantiers' ? 'par Chantier' : 'par Client'}</h3>
        <table>
          <thead>
            <tr>
              <th>{viewMode === 'chantiers' ? 'Chantier' : 'Client'}</th>
              {viewMode === 'chantiers' && <th>Client</th>}
              {viewMode === 'clients' && <th>Chantiers</th>}
              <th>CA Vente HT</th>
              <th>Coût Matière</th>
              <th>Coût RH</th>
              <th>Coût Total</th>
              <th>Marge €</th>
              <th>Marge %</th>
            </tr>
          </thead>
          <tbody>
            {viewMode === 'chantiers' ? (
              deboursParChantier.map(d => (
                <tr key={d.chantier.code}>
                  <td><strong>{d.chantier.nom || d.chantier.code}</strong></td>
                  <td>{d.chantier.nomClient}</td>
                  <td className="amount">{formatEuros(d.vente)}</td>
                  <td className="amount">{formatEuros(d.coutMatiere)}</td>
                  <td className="amount">{formatEuros(d.coutRH)}</td>
                  <td className="amount">{formatEuros(d.coutTotal)}</td>
                  <td className={`amount ${d.marge >= 0 ? 'positive' : 'negative'}`}>
                    {formatEuros(d.marge)}
                  </td>
                  <td className={`amount ${d.margePercent >= 0 ? 'positive' : 'negative'}`}>
                    {formatNumber(d.margePercent, 1)}%
                  </td>
                </tr>
              ))
            ) : (
              deboursParClient.map(d => (
                <tr key={d.client.code}>
                  <td><strong>{d.client.nom || d.client.code}</strong></td>
                  <td className="amount">{d.nbChantiers}</td>
                  <td className="amount">{formatEuros(d.vente)}</td>
                  <td className="amount">{formatEuros(d.coutMatiere)}</td>
                  <td className="amount">{formatEuros(d.coutRH)}</td>
                  <td className="amount">{formatEuros(d.coutTotal)}</td>
                  <td className={`amount ${d.marge >= 0 ? 'positive' : 'negative'}`}>
                    {formatEuros(d.marge)}
                  </td>
                  <td className={`amount ${d.margePercent >= 0 ? 'positive' : 'negative'}`}>
                    {formatNumber(d.margePercent, 1)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="total">
              <td colSpan="2"><strong>TOTAL</strong></td>
              <td className="amount"><strong>{formatEuros(totaux.vente)}</strong></td>
              <td className="amount"><strong>{formatEuros(totaux.coutMatiere)}</strong></td>
              <td className="amount"><strong>{formatEuros(totaux.coutRH)}</strong></td>
              <td className="amount"><strong>{formatEuros(totaux.coutTotal)}</strong></td>
              <td className={`amount ${totaux.marge >= 0 ? '' : 'negative'}`}>
                <strong>{formatEuros(totaux.marge)}</strong>
              </td>
              <td className="amount">
                <strong>{totaux.vente > 0 ? formatNumber((totaux.marge / totaux.vente) * 100, 1) : 0}%</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Indicateurs clés */}
      <div className="analyse-insights">
        <h3>Indicateurs clés</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <span className="insight-label">Nombre de chantiers</span>
            <span className="insight-value">{chantiers.length}</span>
          </div>
          <div className="insight-card">
            <span className="insight-label">Nombre de clients</span>
            <span className="insight-value">{listeClients.length}</span>
          </div>
          <div className="insight-card">
            <span className="insight-label">Marge moyenne/chantier</span>
            <span className={`insight-value ${totaux.marge >= 0 ? 'positive' : 'negative'}`}>
              {deboursParChantier.length > 0
                ? formatEuros(totaux.marge / deboursParChantier.length)
                : '-'
              }
            </span>
          </div>
          <div className="insight-card">
            <span className="insight-label">Taux de marge moyen</span>
            <span className={`insight-value ${totaux.marge >= 0 ? 'positive' : 'negative'}`}>
              {totaux.vente > 0
                ? formatNumber((totaux.marge / totaux.vente) * 100, 1) + '%'
                : '-'
              }
            </span>
          </div>
        </div>
      </div>

      {/* Chantiers les plus/moins rentables */}
      {deboursParChantier.length > 0 && (
        <div className="analyse-extremes">
          <div className="extreme-card positive">
            <h4>Chantier le plus rentable</h4>
            <p className="extreme-name">{deboursParChantier[0].chantier.nom || deboursParChantier[0].chantier.code}</p>
            <p className="extreme-value positive">{formatEuros(deboursParChantier[0].marge)}</p>
            <p className="extreme-percent">({formatNumber(deboursParChantier[0].margePercent, 1)}%)</p>
          </div>
          {deboursParChantier.length > 1 && (
            <div className={`extreme-card ${deboursParChantier[deboursParChantier.length - 1].marge >= 0 ? '' : 'negative'}`}>
              <h4>Chantier le moins rentable</h4>
              <p className="extreme-name">
                {deboursParChantier[deboursParChantier.length - 1].chantier.nom || deboursParChantier[deboursParChantier.length - 1].chantier.code}
              </p>
              <p className={`extreme-value ${deboursParChantier[deboursParChantier.length - 1].marge >= 0 ? '' : 'negative'}`}>
                {formatEuros(deboursParChantier[deboursParChantier.length - 1].marge)}
              </p>
              <p className="extreme-percent">
                ({formatNumber(deboursParChantier[deboursParChantier.length - 1].margePercent, 1)}%)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
