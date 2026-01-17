import { Building2 } from 'lucide-react';

export default function Header({ currentView, setCurrentView }) {
  const navItems = [
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'import', label: 'Import Excel' },
    { id: 'clients', label: 'Clients' },
    { id: 'plans', label: 'Plans' },
    { id: 'situation', label: 'Situation Client' },
    { id: 'situationChantier', label: 'Situation Chantier' },
    { id: 'negoce', label: 'Négoce' },
    { id: 'rh', label: 'RH' },
    { id: 'analyse', label: 'Analyse Financière' },
    { id: 'config', label: 'Configuration' },
  ];

  return (
    <header className="header">
      <div className="header-brand">
        <Building2 size={28} />
        <h1>Gestion Chantier BTP</h1>
      </div>
      <nav className="header-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${currentView === item.id ? 'active' : ''}`}
            onClick={() => setCurrentView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
