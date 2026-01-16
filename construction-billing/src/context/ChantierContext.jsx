import { createContext, useContext, useReducer, useEffect } from 'react';

const ChantierContext = createContext();

const initialState = {
  plans: [], // Liste des plans (HA et TS)
  situations: [], // Situations mensuelles
  currentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
  config: {
    prixAcierKg: 1.50, // Prix de vente par kg d'acier
    prixAchatKg: 1.20, // Prix d'achat par kg
    prixTSM2: 8.00, // Prix de vente treillis soudé par m²
    prixAchatTSM2: 6.00, // Prix d'achat TS
  }
};

function chantierReducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.payload };

    case 'ADD_PLANS':
      // Ajoute les nouveaux plans en évitant les doublons
      const existingIds = new Set(state.plans.map(p => p.id));
      const newPlans = action.payload.filter(p => !existingIds.has(p.id));
      return { ...state, plans: [...state.plans, ...newPlans] };

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
            const avancements = p.avancements || {};
            avancements[action.payload.mois] = action.payload.pourcentage;
            return { ...p, avancements };
          }
          return p;
        })
      };

    case 'SET_CURRENT_MONTH':
      return { ...state, currentMonth: action.payload };

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
    const saved = localStorage.getItem('chantierData');
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
    localStorage.setItem('chantierData', JSON.stringify(state));
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
