import { useMemo } from 'react';
import { useChantier } from '../context/ChantierContext';
import {
  calculerStatistiquesGlobales,
  formatEuros,
  formatNumber,
  getClientsUniques
} from '../utils/calculations';
import { BarChart3, Package, Users } from 'lucide-react';

export default function AnalyseFinanciere() {
  const { state } = useChantier();
  const { plans, clients, config } = state;

  const stats = useMemo(
    () => calculerStatistiquesGlobales(plans, clients, config),
    [plans, clients, config]
  );

  const listeClients = useMemo(() => getClientsUniques(plans), [plans]);

  // Statistiques par client
  const statsParClient = useMemo(() => {
    return listeClients.map(client => {
      const plansClient = plans.filter(p => p.codeClient === client.code);
      const totalASS = plansClient.reduce((sum, p) => sum + (p.poidsASSCommande || 0), 0);
      const totalCF = plansClient.reduce((sum, p) => sum + (p.poidsCFCommande || 0), 0);

      const prixASS = clients[client.code]?.prixASS || config.prixASSDefaut;
      const prixCF = clients[client.code]?.prixCF || config.prixCFDefaut;

      const montant = (totalASS * prixASS) + (totalCF * prixCF);

      return {
        code: client.code,
        nom: client.nom,
        nbPlans: plansClient.length,
        totalASS,
        totalCF,
        totalPoids: totalASS + totalCF,
        montant
      };
    }).sort((a, b) => b.montant - a.montant);
  }, [plans, clients, config, listeClients]);

  return (
    <div className="analyse-financiere">
      <h2>Analyse Financière</h2>

      <div className="analyse-summary">
        <div className="summary-card large">
          <div className="summary-icon">
            <BarChart3 size={32} />
          </div>
          <div className="summary-content">
            <span className="summary-value">{formatEuros(stats.totalMontant)}</span>
            <span className="summary-label">Montant total commandé</span>
          </div>
        </div>

        <div className="summary-card large">
          <div className="summary-icon">
            <Package size={32} />
          </div>
          <div className="summary-content">
            <span className="summary-value">{formatNumber(stats.totalPoidsHA, 0)} kg</span>
            <span className="summary-label">Total acier (ASS + CF)</span>
          </div>
        </div>

        <div className="summary-card large">
          <div className="summary-icon">
            <Users size={32} />
          </div>
          <div className="summary-content">
            <span className="summary-value">{listeClients.length}</span>
            <span className="summary-label">Clients actifs</span>
          </div>
        </div>
      </div>

      <div className="analyse-table">
        <h3>Répartition par client</h3>
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Nb Plans</th>
              <th>ASS (kg)</th>
              <th>CF (kg)</th>
              <th>Total (kg)</th>
              <th>Montant HT</th>
              <th>Part CA</th>
            </tr>
          </thead>
          <tbody>
            {statsParClient.map(client => (
              <tr key={client.code}>
                <td><strong>{client.nom || client.code}</strong></td>
                <td className="amount">{client.nbPlans}</td>
                <td className="amount">{formatNumber(client.totalASS, 0)}</td>
                <td className="amount">{formatNumber(client.totalCF, 0)}</td>
                <td className="amount">{formatNumber(client.totalPoids, 0)}</td>
                <td className="amount">{formatEuros(client.montant)}</td>
                <td className="percent">
                  {stats.totalMontant > 0
                    ? formatNumber((client.montant / stats.totalMontant) * 100, 1) + '%'
                    : '0%'
                  }
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="total">
              <td><strong>TOTAL</strong></td>
              <td className="amount"><strong>{stats.nbPlans}</strong></td>
              <td className="amount"><strong>{formatNumber(stats.totalPoidsASS, 0)}</strong></td>
              <td className="amount"><strong>{formatNumber(stats.totalPoidsCF, 0)}</strong></td>
              <td className="amount"><strong>{formatNumber(stats.totalPoidsHA, 0)}</strong></td>
              <td className="amount"><strong>{formatEuros(stats.totalMontant)}</strong></td>
              <td className="percent"><strong>100%</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="analyse-insights">
        <h3>Indicateurs clés</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <span className="insight-label">Prix moyen ASS</span>
            <span className="insight-value">{formatEuros(config.prixASSDefaut)}/kg</span>
          </div>
          <div className="insight-card">
            <span className="insight-label">Prix moyen CF</span>
            <span className="insight-value">{formatEuros(config.prixCFDefaut)}/kg</span>
          </div>
          <div className="insight-card">
            <span className="insight-label">Poids moyen/plan</span>
            <span className="insight-value">
              {stats.nbPlans > 0
                ? formatNumber(stats.totalPoidsHA / stats.nbPlans, 0) + ' kg'
                : '-'
              }
            </span>
          </div>
          <div className="insight-card">
            <span className="insight-label">CA moyen/client</span>
            <span className="insight-value">
              {listeClients.length > 0
                ? formatEuros(stats.totalMontant / listeClients.length)
                : '-'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
