import { useState } from 'react';
import { ChantierProvider } from './context/ChantierContext';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import ExcelImport from './components/ExcelImport';
import Clients from './components/Clients';
import PlansManager from './components/PlansManager';
import SituationMensuelle from './components/SituationMensuelle';
import SituationChantier from './components/SituationChantier';
import Negoce from './components/Negoce';
import RessourcesHumaines from './components/RessourcesHumaines';
import AnalyseFinanciere from './components/AnalyseFinanciere';
import Configuration from './components/Configuration';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'import':
        return <ExcelImport />;
      case 'clients':
        return <Clients />;
      case 'plans':
        return <PlansManager />;
      case 'situation':
        return <SituationMensuelle />;
      case 'situationChantier':
        return <SituationChantier />;
      case 'negoce':
        return <Negoce />;
      case 'rh':
        return <RessourcesHumaines />;
      case 'analyse':
        return <AnalyseFinanciere />;
      case 'config':
        return <Configuration />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ChantierProvider>
      <div className="app">
        <Header currentView={currentView} setCurrentView={setCurrentView} />
        <main className="main-content">
          {renderView()}
        </main>
        <footer className="footer">
          <p>Gestion Chantier BTP - Application de situations mensuelles</p>
        </footer>
      </div>
    </ChantierProvider>
  );
}

export default App;
