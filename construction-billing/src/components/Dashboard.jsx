import { useChantier } from '../context/ChantierContext';
import { calculerSituation, formatEuros, formatNumber } from '../utils/calculations';
import { TrendingUp, TrendingDown, FileText, Package, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { state } = useChantier();
  const { plans, currentMonth, config } = state;

  const situation = calculerSituation(plans, currentMonth, config);

  const plansHA = plans.filter(p => p.type === 'HA');
  const plansTS = plans.filter(p => p.type === 'TS');

  const totalPoidsHA = plansHA.reduce((sum, p) => sum + p.poidsKg, 0);
  const totalSurfaceTS = plansTS.reduce((sum, p) => sum + p.surfaceM2, 0);

  const isGain = situation.resultat.mois >= 0;

  return (
    <div className="dashboard">
      <h2>Tableau de Bord - {formatMois(currentMonth)}</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{plans.length}</span>
            <span className="stat-label">Plans totaux</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatNumber(totalPoidsHA, 0)} kg</span>
            <span className="stat-label">Acier HA ({plansHA.length} plans)</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatNumber(totalSurfaceTS, 0)} m²</span>
            <span className="stat-label">Treillis soudés ({plansTS.length} plans)</span>
          </div>
        </div>

        <div className={`stat-card ${isGain ? 'positive' : 'negative'}`}>
          <div className="stat-icon">
            {isGain ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatEuros(situation.resultat.mois)}</span>
            <span className="stat-label">Résultat du mois</span>
          </div>
        </div>
      </div>

      <div className="dashboard-summary">
        <h3>Résumé Situation Mensuelle</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th></th>
              <th>Cumul Antérieur</th>
              <th>Mois en cours</th>
              <th>Nouveau Cumul</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Chiffre d'affaires</strong></td>
              <td>{formatEuros(situation.totaux.total.cumulAnt)}</td>
              <td>{formatEuros(situation.totaux.total.mois)}</td>
              <td>{formatEuros(situation.totaux.total.cumulNouveau)}</td>
            </tr>
            <tr className="sub-row">
              <td>- Acier HA</td>
              <td>{formatEuros(situation.totaux.ha.cumulAnt)}</td>
              <td>{formatEuros(situation.totaux.ha.mois)}</td>
              <td>{formatEuros(situation.totaux.ha.cumulNouveau)}</td>
            </tr>
            <tr className="sub-row">
              <td>- Treillis soudés</td>
              <td>{formatEuros(situation.totaux.ts.cumulAnt)}</td>
              <td>{formatEuros(situation.totaux.ts.mois)}</td>
              <td>{formatEuros(situation.totaux.ts.cumulNouveau)}</td>
            </tr>
            <tr>
              <td><strong>Coûts</strong></td>
              <td>{formatEuros(situation.couts.total.cumulAnt)}</td>
              <td>{formatEuros(situation.couts.total.mois)}</td>
              <td>{formatEuros(situation.couts.total.cumulNouveau)}</td>
            </tr>
            <tr className={`result-row ${isGain ? 'positive' : 'negative'}`}>
              <td><strong>Résultat (Marge)</strong></td>
              <td>{formatEuros(situation.resultat.cumulAnt)}</td>
              <td>{formatEuros(situation.resultat.mois)}</td>
              <td>{formatEuros(situation.resultat.cumulNouveau)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="month-selector">
        <Calendar size={20} />
        <label>Mois sélectionné:</label>
        <input
          type="month"
          value={currentMonth}
          onChange={(e) => state.dispatch?.({ type: 'SET_CURRENT_MONTH', payload: e.target.value })}
        />
      </div>
    </div>
  );
}

function formatMois(mois) {
  const [year, month] = mois.split('-');
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
