import { useChantier } from '../context/ChantierContext';
import { calculerStatistiquesGlobales, formatEuros, formatNumber, getClientsUniques } from '../utils/calculations';
import { FileText, Package, Users, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { state, dispatch } = useChantier();
  const { plans, clients, currentMonth, config } = state;

  const stats = calculerStatistiquesGlobales(plans, clients, config);
  const listeClients = getClientsUniques(plans);

  return (
    <div className="dashboard">
      <h2>Tableau de Bord - {formatMois(currentMonth)}</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.nbPlans}</span>
            <span className="stat-label">Plans totaux</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{listeClients.length}</span>
            <span className="stat-label">Clients</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatNumber(stats.totalPoidsASS, 0)} kg</span>
            <span className="stat-label">Acier ASS</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Package size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatNumber(stats.totalPoidsCF, 0)} kg</span>
            <span className="stat-label">Acier CF</span>
          </div>
        </div>
      </div>

      <div className="dashboard-summary">
        <h3>Montant total commandé</h3>
        <div className="big-number">
          {formatEuros(stats.totalMontant)}
        </div>
      </div>

      <div className="dashboard-clients">
        <h3>Clients ({listeClients.length})</h3>
        <div className="clients-grid">
          {listeClients.slice(0, 8).map(client => {
            const plansClient = plans.filter(p => p.codeClient === client.code);
            const poidsTotal = plansClient.reduce((sum, p) =>
              sum + (p.poidsASSCommande || 0) + (p.poidsCFCommande || 0), 0
            );
            return (
              <div key={client.code} className="client-card">
                <div className="client-name">{client.nom || client.code}</div>
                <div className="client-stats">
                  <span>{plansClient.length} plans</span>
                  <span>{formatNumber(poidsTotal, 0)} kg</span>
                </div>
              </div>
            );
          })}
        </div>
        {listeClients.length > 8 && (
          <p className="more-clients">+ {listeClients.length - 8} autres clients</p>
        )}
      </div>

      <div className="month-selector">
        <Calendar size={20} />
        <label>Mois sélectionné:</label>
        <input
          type="month"
          value={currentMonth}
          onChange={(e) => dispatch({ type: 'SET_CURRENT_MONTH', payload: e.target.value })}
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
