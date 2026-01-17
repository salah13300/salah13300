import { createContext, useContext, useReducer, useEffect } from 'react';

const ChantierContext = createContext();

const initialState = {
  plans: [], // Liste des plans (HA ASS, HA CF, TS)
  clients: {}, // Prix par client : { "BATARM": { prixASS: 1.50, prixCF: 1.80, prixTS: 8.00 }, ... }
  currentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
  currentClient: null, // Client sélectionné pour la situation
  config: {
    // Prix par défaut (utilisés si pas de prix client spécifique)
    prixASSDefaut: 1.50, // Prix de vente ASS par kg
    prixCFDefaut: 1.80, // Prix de vente CF par kg
    prixTSDefaut: 8.00, // Prix de vente TS par m²
    // Prix d'achat (coûts)
    coutASS: 1.20,
    coutCF: 1.40,
    coutTS: 6.00,
    // TVA
    tva: 20,
  }
};

function chantierReducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.payload };

    case 'ADD_PLANS': {
      // Ajoute les nouveaux plans en évitant les doublons (basé sur code + numeroPlan)
      const existingKeys = new Set(state.plans.map(p => `${p.code}-${p.numeroPlan}`));
      const newPlans = action.payload.filter(p => !existingKeys.has(`${p.code}-${p.numeroPlan}`));

      // Extraire les clients uniques pour créer les entrées de prix
      const newClients = { ...state.clients };
      newPlans.forEach(p => {
        if (p.codeClient && !newClients[p.codeClient]) {
          newClients[p.codeClient] = {
            nom: p.nomClient,
            prixASS: state.config.prixASSDefaut,
            prixCF: state.config.prixCFDefaut,
            prixTS: state.config.prixTSDefaut,
          };
        }
      });

      return {
        ...state,
        plans: [...state.plans, ...newPlans],
        clients: newClients
      };
    }

    case 'UPDATE_PLAN':
      return {
        ...state,
        plans: state.plans.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload } : p
        )
      };

    case 'UPDATE_PLAN_AVANCEMENT':
      return {
        ...state,
        plans: state.plans.map(p => {
          if (p.id === action.payload.planId) {
            const avancements = { ...p.avancements } || {};
            avancements[action.payload.mois] = action.payload.pourcentage;
            return { ...p, avancements };
          }
          return p;
        })
      };

    case 'SET_CURRENT_MONTH':
      return { ...state, currentMonth: action.payload };

    case 'SET_CURRENT_CLIENT':
      return { ...state, currentClient: action.payload };

    case 'UPDATE_CLIENT_PRIX':
      return {
        ...state,
        clients: {
          ...state.clients,
          [action.payload.codeClient]: {
            ...state.clients[action.payload.codeClient],
            ...action.payload.prix
          }
        }
      };

    case 'UPDATE_CONFIG':
      return { ...state, config: { ...state.config, ...action.payload } };

    case 'DELETE_PLAN':
      return { ...state, plans: state.plans.filter(p => p.id !== action.payload) };

    case 'CLEAR_ALL':
      return { ...initialState, config: state.config };

    default:
      return state;
  }
}

export function ChantierProvider({ children }) {
  const [state, dispatch] = useReducer(chantierReducer, initialState);

  // Charger depuis localStorage au démarrage
  useEffect(() => {
    const saved = localStorage.getItem('chantierDataV2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_STATE', payload: parsed });
      } catch (e) {
        console.error('Erreur chargement données:', e);
      }
    }
  }, []);

  // Sauvegarder à chaque changement
  useEffect(() => {
    localStorage.setItem('chantierDataV2', JSON.stringify(state));
  }, [state]);

  return (
    <ChantierContext.Provider value={{ state, dispatch }}>
      {children}
    </ChantierContext.Provider>
  );
}

export function useChantier() {
  const context = useContext(ChantierContext);
  if (!context) {
    throw new Error('useChantier doit être utilisé dans un ChantierProvider');
  }
  return context;
}
