import { useMemo } from 'react';
import { useChantier } from '../context/ChantierContext';
import {
  calculerHistoriqueResultats,
  formatEuros,
  formatNumber,
  getMoisDisponibles
} from '../utils/calculations';
import { TrendingUp, TrendingDown, BarChart3, PieChart } from 'lucide-react';

export default function AnalyseFinanciere() {
  const { state } = useChantier();
  const { plans, config } = state;

  const historique = useMemo(
    () => calculerHistoriqueResultats(plans, config),
    [plans, config]
  );

  const totaux = useMemo(() => {
    return historique.reduce((acc, h) => ({
      ca: acc.ca + h.chiffreAffaires,
      couts: acc.couts + h.couts,
      marge: acc.marge + h.marge
    }), { ca: 0, couts: 0, marge: 0 });
  }, [historique]);

  const margeGlobalePercent = totaux.ca > 0 ? (totaux.marge / totaux.ca) * 100 : 0;

  const formatMois = (mois) => {
    const [year, month] = mois.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  };

  // Calcul du max pour les barres
  const maxCA = Math.max(...historique.map(h => h.chiffreAffaires), 1);

  return (
    <div className="analyse-financiere">
      <h2>Analyse Financière</h2>

      <div className="analyse-summary">
        <div className="summary-card large">
          <div className="summary-icon">
            <BarChart3 size={32} />
          </div>
          <div className="summary-content">
            <span className="summary-value">{formatEuros(totaux.ca)}</span>
            <span className="summary-label">Chiffre d'affaires total</span>
          </div>
        </div>

        <div className="summary-card large">
          <div className="summary-icon negative">
            <PieChart size={32} />
          </div>
          <div className="summary-content">
            <span className="summary-value">{formatEuros(totaux.couts)}</span>
            <span className="summary-label">Coûts totaux</span>
          </div>
        </div>

        <div className={`summary-card large ${totaux.marge >= 0 ? 'positive' : 'negative'}`}>
          <div className="summary-icon">
            {totaux.marge >= 0 ? <TrendingUp size={32} /> : <TrendingDown size={32} />}
          </div>
          <div className="summary-content">
            <span className="summary-value">{formatEuros(totaux.marge)}</span>
            <span className="summary-label">
              Marge totale ({formatNumber(margeGlobalePercent, 1)}%)
            </span>
          </div>
        </div>
      </div>

      <div className="analyse-chart">
        <h3>Évolution mensuelle</h3>
        <div className="chart-container">
          {historique.length === 0 ? (
            <div className="empty-state">
              <p>Aucune donnée disponible</p>
              <p className="hint">Importez des plans et saisissez les avancements</p>
            </div>
          ) : (
            <div className="bar-chart">
              {historique.map((h, index) => (
                <div key={h.mois} className="bar-group">
                  <div className="bars">
                    <div
                      className="bar ca"
                      style={{ height: `${(h.chiffreAffaires / maxCA) * 100}%` }}
                      title={`CA: ${formatEuros(h.chiffreAffaires)}`}
                    >
                      <span className="bar-value">{formatEuros(h.chiffreAffaires)}</span>
                    </div>
                    <div
                      className="bar couts"
                      style={{ height: `${(h.couts / maxCA) * 100}%` }}
                      title={`Coûts: ${formatEuros(h.couts)}`}
                    />
                  </div>
                  <div className={`marge-indicator ${h.marge >= 0 ? 'positive' : 'negative'}`}>
                    {h.marge >= 0 ? '+' : ''}{formatEuros(h.marge)}
                  </div>
                  <div className="bar-label">{formatMois(h.mois)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="chart-legend">
          <span className="legend-item ca">CA</span>
          <span className="legend-item couts">Coûts</span>
        </div>
      </div>

      <div className="analyse-table">
        <h3>Détail par mois</h3>
        <table>
          <thead>
            <tr>
              <th>Mois</th>
              <th>Chiffre d'affaires</th>
              <th>Coûts</th>
              <th>Marge</th>
              <th>Taux de marge</th>
              <th>Tendance</th>
            </tr>
          </thead>
          <tbody>
            {historique.map((h, index) => {
              const prevMarge = index > 0 ? historique[index - 1].marge : 0;
              const tendance = h.marge - prevMarge;

              return (
                <tr key={h.mois}>
                  <td>{formatMois(h.mois)}</td>
                  <td className="amount">{formatEuros(h.chiffreAffaires)}</td>
                  <td className="amount">{formatEuros(h.couts)}</td>
                  <td className={`amount ${h.marge >= 0 ? 'positive' : 'negative'}`}>
                    {formatEuros(h.marge)}
                  </td>
                  <td className={`percent ${h.margePercent >= 0 ? 'positive' : 'negative'}`}>
                    {formatNumber(h.margePercent, 1)}%
                  </td>
                  <td className="tendance">
                    {index > 0 && (
                      <span className={tendance >= 0 ? 'positive' : 'negative'}>
                        {tendance >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {tendance >= 0 ? '+' : ''}{formatEuros(tendance)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="total">
              <td><strong>TOTAL</strong></td>
              <td className="amount"><strong>{formatEuros(totaux.ca)}</strong></td>
              <td className="amount"><strong>{formatEuros(totaux.couts)}</strong></td>
              <td className={`amount ${totaux.marge >= 0 ? 'positive' : 'negative'}`}>
                <strong>{formatEuros(totaux.marge)}</strong>
              </td>
              <td className={`percent ${margeGlobalePercent >= 0 ? 'positive' : 'negative'}`}>
                <strong>{formatNumber(margeGlobalePercent, 1)}%</strong>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="analyse-insights">
        <h3>Indicateurs clés</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <span className="insight-label">Meilleur mois</span>
            <span className="insight-value">
              {historique.length > 0
                ? formatMois(historique.reduce((best, h) =>
                    h.marge > best.marge ? h : best
                  ).mois)
                : '-'
              }
            </span>
          </div>
          <div className="insight-card">
            <span className="insight-label">Marge moyenne</span>
            <span className="insight-value">
              {historique.length > 0
                ? formatEuros(totaux.marge / historique.length)
                : '-'
              }
            </span>
          </div>
          <div className="insight-card">
            <span className="insight-label">Mois rentables</span>
            <span className="insight-value">
              {historique.filter(h => h.marge > 0).length} / {historique.length}
            </span>
          </div>
          <div className="insight-card">
            <span className="insight-label">CA moyen/mois</span>
            <span className="insight-value">
              {historique.length > 0
                ? formatEuros(totaux.ca / historique.length)
                : '-'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
