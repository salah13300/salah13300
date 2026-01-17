import { createContext, useContext, useReducer, useEffect } from 'react';

const ChantierContext = createContext();

// Prestations par défaut avec leurs prix
const prestationsDefaut = {
  'HA': { nom: 'Fourniture & Pose HA', unite: 'kg', prixVente: 1.32, prixAchat: 1.00 },
  'Treillis-Pose': { nom: 'Pose treillis-soudés', unite: 'kg', prixVente: 0.40, prixAchat: 0.30 },
  'Ecarteur': { nom: 'Fourniture et pose de distancier', unite: 'u', prixVente: 1.30, prixAchat: 0.80 },
  'Rupteur': { nom: 'Pose de rupture thermique', unite: 'u', prixVente: 3.00, prixAchat: 2.00 },
  'Redressage': { nom: 'Redressage des aciers des autres lots', unite: 'kg', prixVente: 4.00, prixAchat: 3.00 },
  'BA-pose': { nom: 'Pose Boîte d\'attentes', unite: 'u', prixVente: 4.00, prixAchat: 2.50 },
  'Suspentes': { nom: 'Redressage Suspentes', unite: 'u', prixVente: 0.00, prixAchat: 0.00 },
  'Depliage': { nom: 'Dépliage, Façonnage console courte', unite: 'u', prixVente: 15.00, prixAchat: 10.00 },
  'Samedi': { nom: 'Plus-Value travail du Samedi', unite: 'h', prixVente: 250.00, prixAchat: 200.00 },
  'Manutention': { nom: 'Plus-Value manutention HA+TS', unite: 'kg', prixVente: 0.00, prixAchat: 0.00 },
  'Regie': { nom: 'Heures de régie', unite: 'h', prixVente: 39.00, prixAchat: 30.00 },
  'Chapeaux': { nom: 'Chapeaux de poutre', unite: 'u', prixVente: 0.30, prixAchat: 0.20 },
  'Urgence': { nom: 'Aciers hors délais contractuels', unite: 'kg', prixVente: 0.30, prixAchat: 0.20 },
  'Auto-D': { nom: 'Transport Auto-D', unite: 'u', prixVente: 780.00, prixAchat: 600.00 },
  'Etiquettes': { nom: 'Fourniture d\'étiquettes certifiées conforme NF', unite: 'u', prixVente: 0.015, prixAchat: 0.01 },
  'Livraison': { nom: 'Livraison par camion <3 T', unite: 'u', prixVente: 0.00, prixAchat: 0.00 },
  'Camion': { nom: 'Livraison petit camion', unite: 'u', prixVente: 250.00, prixAchat: 180.00 },
  'Exterieur': { nom: 'Acier si extérieur', unite: 'kg', prixVente: 0.650, prixAchat: 0.50 },
  'Jeton': { nom: 'Jetons de prénum', unite: 'u', prixVente: 0.00, prixAchat: 0.00 },
  'Assurance': { nom: 'Assurance décennale', unite: '%CA', prixVente: 0.00, prixAchat: 0.00 },
};

const initialState = {
  plans: [], // Liste des plans (HA ASS, HA CF, TS)
  clients: {}, // Prix par client : { "BATARM": { prixASS: 1.50, prixCF: 1.80, prixTS: 8.00 }, ... }
  prestations: prestationsDefaut, // Codes prestations avec prix
  articlesManuals: [], // Articles ajoutés manuellement aux situations
  negoce: [], // Articles de négoce
  // Ressources Humaines
  salaries: [], // Liste des salariés: { id, nom, prenom, fonction, tauxHoraire, chargesPatronales }
  affectations: [], // Affectations chantier: { id, salarieId, codeChantier, mois, heures, fraisKm, notesFrais }
  notesFrais: [], // Notes de frais: { id, salarieId, codeChantier, mois, description, montant, type }
  currentMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
  currentClient: null, // Client sélectionné pour la situation
  currentChantier: null, // Chantier sélectionné pour filtrage
  config: {
    // Prix par défaut (utilisés si pas de prix client spécifique)
    prixASSDefaut: 1.32, // Prix de vente ASS par kg (HA)
    prixCFDefaut: 1.80, // Prix de vente CF par kg
    prixTSDefaut: 0.40, // Prix de vente TS par kg (Treillis-Pose)
    // Prix d'achat (coûts)
    coutASS: 1.00,
    coutCF: 1.40,
    coutTS: 0.30,
    // TVA
    tva: 20,
    // Paramètres RH
    tauxChargesPatronales: 45, // % de charges patronales
    tauxFraisKm: 0.55, // € par km
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

    case 'SET_CURRENT_CHANTIER':
      return { ...state, currentChantier: action.payload };

    case 'ADD_ARTICLE_MANUAL': {
      const newArticle = {
        ...action.payload,
        id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'manual',
      };
      return { ...state, articlesManuals: [...state.articlesManuals, newArticle] };
    }

    case 'UPDATE_ARTICLE_MANUAL':
      return {
        ...state,
        articlesManuals: state.articlesManuals.map(a =>
          a.id === action.payload.id ? { ...a, ...action.payload } : a
        )
      };

    case 'DELETE_ARTICLE_MANUAL':
      return {
        ...state,
        articlesManuals: state.articlesManuals.filter(a => a.id !== action.payload)
      };

    case 'ADD_NEGOCE': {
      const newNegoce = {
        ...action.payload,
        id: `negoce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      return { ...state, negoce: [...state.negoce, newNegoce] };
    }

    case 'UPDATE_NEGOCE':
      return {
        ...state,
        negoce: state.negoce.map(n =>
          n.id === action.payload.id ? { ...n, ...action.payload } : n
        )
      };

    case 'DELETE_NEGOCE':
      return {
        ...state,
        negoce: state.negoce.filter(n => n.id !== action.payload)
      };

    // Prestations
    case 'UPDATE_PRESTATION':
      return {
        ...state,
        prestations: {
          ...state.prestations,
          [action.payload.code]: {
            ...state.prestations[action.payload.code],
            ...action.payload.data
          }
        }
      };

    case 'ADD_PRESTATION':
      return {
        ...state,
        prestations: {
          ...state.prestations,
          [action.payload.code]: action.payload.data
        }
      };

    case 'DELETE_PRESTATION': {
      const newPrestations = { ...state.prestations };
      delete newPrestations[action.payload];
      return { ...state, prestations: newPrestations };
    }

    // Salariés
    case 'ADD_SALARIE': {
      const newSalarie = {
        ...action.payload,
        id: `sal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      return { ...state, salaries: [...state.salaries, newSalarie] };
    }

    case 'UPDATE_SALARIE':
      return {
        ...state,
        salaries: state.salaries.map(s =>
          s.id === action.payload.id ? { ...s, ...action.payload } : s
        )
      };

    case 'DELETE_SALARIE':
      return {
        ...state,
        salaries: state.salaries.filter(s => s.id !== action.payload),
        affectations: state.affectations.filter(a => a.salarieId !== action.payload),
        notesFrais: state.notesFrais.filter(n => n.salarieId !== action.payload)
      };

    // Affectations
    case 'ADD_AFFECTATION': {
      const newAffectation = {
        ...action.payload,
        id: `aff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      return { ...state, affectations: [...state.affectations, newAffectation] };
    }

    case 'UPDATE_AFFECTATION':
      return {
        ...state,
        affectations: state.affectations.map(a =>
          a.id === action.payload.id ? { ...a, ...action.payload } : a
        )
      };

    case 'DELETE_AFFECTATION':
      return {
        ...state,
        affectations: state.affectations.filter(a => a.id !== action.payload)
      };

    // Notes de frais
    case 'ADD_NOTE_FRAIS': {
      const newNote = {
        ...action.payload,
        id: `ndf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };
      return { ...state, notesFrais: [...state.notesFrais, newNote] };
    }

    case 'UPDATE_NOTE_FRAIS':
      return {
        ...state,
        notesFrais: state.notesFrais.map(n =>
          n.id === action.payload.id ? { ...n, ...action.payload } : n
        )
      };

    case 'DELETE_NOTE_FRAIS':
      return {
        ...state,
        notesFrais: state.notesFrais.filter(n => n.id !== action.payload)
      };

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
