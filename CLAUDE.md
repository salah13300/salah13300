# CLAUDE.md - Guide for AI Assistants

## Project Overview

**Construction Billing App** (Gestion Chantier BTP) - A French construction site management and billing application for tracking steel reinforcement work (HA - Haute Adhérence, CF - Coupe Façonnage, TS - Treillis Soudés), client management, monthly billing situations, HR tracking, and financial analysis.

**Primary Language**: French (UI, comments, business logic)
**Tech Stack**: React 19 + Vite 7 (JavaScript/JSX)

## Directory Structure

```
salah13300/
├── construction-billing/          # Main application
│   ├── src/
│   │   ├── App.jsx               # Root component with view routing
│   │   ├── main.jsx              # Entry point
│   │   ├── App.css               # All application styles
│   │   ├── index.css             # Base styles
│   │   ├── components/           # UI Components
│   │   │   ├── Header.jsx        # Navigation header
│   │   │   ├── Dashboard.jsx     # Main dashboard with stats
│   │   │   ├── ExcelImport.jsx   # Excel file import
│   │   │   ├── Clients.jsx       # Client/site management
│   │   │   ├── PlansManager.jsx  # Plans tracking with progress
│   │   │   ├── SituationMensuelle.jsx  # Monthly billing situation
│   │   │   ├── SituationChantier.jsx   # Per-site billing situation
│   │   │   ├── Negoce.jsx        # Trading articles management
│   │   │   ├── RessourcesHumaines.jsx  # HR: employees, assignments
│   │   │   ├── AnalyseFinanciere.jsx   # Financial analysis
│   │   │   └── Configuration.jsx # App settings
│   │   ├── context/
│   │   │   └── ChantierContext.jsx  # Global state (useReducer + Context)
│   │   └── utils/
│   │       ├── calculations.js   # Business logic & calculations
│   │       └── excelParser.js    # Excel import/export utilities
│   ├── dist/                     # Production build output
│   ├── package.json
│   ├── vite.config.js
│   └── eslint.config.js
├── construction-billing.zip      # Archived versions
├── construction-billing-app.zip
└── construction-billing-dist.zip
```

## Development Commands

```bash
cd construction-billing

# Install dependencies
npm install

# Development server (hot reload)
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture & Conventions

### State Management

The application uses **React Context + useReducer** pattern for global state. All state is managed in `ChantierContext.jsx`.

**Key State Structure:**
```javascript
{
  plans: [],           // Steel reinforcement plans (HA, CF, TS)
  clients: {},         // Client hierarchy with site-specific pricing
  prestations: {},     // Service codes with default prices
  articlesManuals: [], // Manually added billing items
  negoce: [],          // Trading articles
  salaries: [],        // Employees
  affectations: [],    // Employee-site assignments
  notesFrais: [],      // Expense reports
  currentMonth: 'YYYY-MM',
  currentClient: null,
  currentChantier: null,
  config: { ... }      // Default prices, VAT rate, HR rates
}
```

**Dispatch Actions:**
- Use action types like `ADD_PLANS`, `UPDATE_PLAN`, `SET_CURRENT_MONTH`, etc.
- Always use `dispatch({ type: 'ACTION_TYPE', payload: data })`

**Data Persistence:**
- All state is persisted to `localStorage` under key `'chantierDataV2'`
- Auto-loads on app start, auto-saves on every change

### Component Patterns

1. **Use the context hook:**
   ```javascript
   import { useChantier } from '../context/ChantierContext';
   const { state, dispatch } = useChantier();
   ```

2. **Memoize expensive calculations:**
   ```javascript
   const result = useMemo(() => expensiveCalc(data), [data]);
   ```

3. **View-based routing in App.jsx:**
   ```javascript
   const [currentView, setCurrentView] = useState('dashboard');
   // Views: dashboard, import, clients, plans, situation, situationChantier,
   //        negoce, rh, analyse, config
   ```

### Styling

- **Single CSS file:** `src/App.css` contains all styles
- **CSS Variables** defined in `:root` for theming:
  - `--primary-color`, `--danger-color`, `--success-color`
  - `--background`, `--surface`, `--border`
  - `--text-primary`, `--text-secondary`
- **BEM-like naming:** `.component-name`, `.component-name-element`
- **Modifier classes:** `.positive`, `.negative`, `.highlight`, `.active`

### Business Logic

Located in `src/utils/calculations.js`:

- `calculerSituationClient()` - Monthly billing per client
- `calculerSituationChantier()` - Monthly billing per site
- `calculerMontantsPlan()` - Plan amounts (sales + costs)
- `calculerAvancementCumule()` - Cumulative progress tracking
- `formatEuros()`, `formatNumber()` - French number formatting
- `getMoisPrecedent()`, `getMoisSuivant()` - Date utilities

### Excel Import/Export

Located in `src/utils/excelParser.js`:

- Uses `xlsx` library
- `parseExcelFile()` - Parse uploaded Excel files
- `generateTemplate()` - Generate HA template
- `generateTemplateTS()` - Generate Treillis Soudés template

**Expected Excel columns:**
- Code, Code chantier, Code client, Nom client, Nom chantier
- No/ind. plan, Désignation
- Poids ASS commandé, Poids CF commandé (for HA)
- Poids TS commandé (for Treillis Soudés)
- Usine, Date prévue, BL. No

## Domain Vocabulary

| French Term | English | Description |
|-------------|---------|-------------|
| Chantier | Construction site | A project/worksite |
| Client | Client | Customer company |
| Plan | Blueprint/Plan | Steel reinforcement drawing |
| HA | High Adhesion steel | Béton armé steel type |
| CF | Cut & Shape | Coupe Façonnage steel |
| TS | Welded mesh | Treillis Soudés |
| ASS | Assembly | Part of HA classification |
| Situation | Billing statement | Monthly progress billing |
| Avancement | Progress | Percentage completion |
| Négoce | Trading | Resale articles |
| Prestation | Service | Billable service item |
| Salarié | Employee | Staff member |
| Affectation | Assignment | Employee-site allocation |
| Note de frais | Expense report | Reimbursable expenses |
| BL | Delivery note | Bon de Livraison |
| TTC | Tax included | Toutes Taxes Comprises |
| HT | Before tax | Hors Taxes |
| TVA | VAT | Value Added Tax (20% default) |

## Key Dependencies

```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "date-fns": "^4.1.0",      // Date manipulation
  "lucide-react": "^0.562.0", // Icon components
  "xlsx": "^0.18.5"          // Excel file handling
}
```

## Code Quality

### ESLint Configuration

Located in `eslint.config.js`:
- Uses `@eslint/js` recommended rules
- React Hooks plugin enabled
- React Refresh plugin for Vite
- Custom rule: `no-unused-vars` ignores variables starting with uppercase

### Best Practices for This Codebase

1. **Always use French for:**
   - Variable names in business logic (e.g., `avancement`, `montant`, `chantier`)
   - UI text and labels
   - Comments explaining business rules

2. **Number formatting:**
   - Always use `formatEuros()` for currency
   - Always use `formatNumber()` for quantities
   - French locale: spaces as thousands separator, comma as decimal

3. **Date handling:**
   - Use `YYYY-MM` format for months (`currentMonth`)
   - Use `YYYY-MM-DD` for full dates
   - Use provided utilities for date calculations

4. **ID Generation:**
   ```javascript
   `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
   ```

5. **Form handling:**
   - Use controlled inputs
   - Parse numbers with `parseFloat()` before calculations
   - Default to 0 for missing numeric values

## Common Tasks

### Adding a New Component

1. Create file in `src/components/NewComponent.jsx`
2. Import `useChantier` if state access needed
3. Import required utilities from `utils/calculations.js`
4. Import icons from `lucide-react`
5. Add view case in `App.jsx` `renderView()` switch
6. Add navigation item in `Header.jsx` `navItems` array
7. Add styles in `App.css`

### Adding a New Action

1. Define action type in reducer (`ChantierContext.jsx`)
2. Add case in `chantierReducer` switch statement
3. Use `dispatch({ type: 'NEW_ACTION', payload: data })` from components

### Modifying Pricing Logic

1. Default prices are in `config` state object
2. Client-specific prices in `clients[code].chantiers[code]`
3. Update `calculerMontantsPlan()` in `calculations.js`
4. Ensure `getPrixClient()` handles the new price type

## Testing & Debugging

- No test framework configured
- Use browser DevTools for debugging
- State can be inspected via `localStorage.getItem('chantierDataV2')`
- Console errors will show in Vite dev server output

## Build & Deployment

```bash
npm run build
# Output in dist/ folder
# Can be served by any static file server
# vite.config.js has base: './' for relative paths
```

## Git Workflow

- Main development happens on feature branches
- Commit messages should be in French to match codebase
- Format: `type: description` (e.g., `feat: Ajout export PDF`, `fix: Correction calcul TVA`)
