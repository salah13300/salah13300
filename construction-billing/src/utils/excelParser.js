import * as XLSX from 'xlsx';

/**
 * Parse un fichier Excel contenant des plans HA ou TS
 * Colonnes attendues: Numéro Plan, Désignation, Type (HA/TS), Poids (kg), Surface (m²), Date Livraison
 */
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

        const plans = jsonData.map((row, index) => {
          // Mapping flexible des colonnes
          const plan = {
            id: generatePlanId(row),
            numeroPlan: row['Numéro Plan'] || row['N° Plan'] || row['Plan'] || row['numero_plan'] || `PLAN-${index + 1}`,
            designation: row['Désignation'] || row['Description'] || row['designation'] || '',
            type: detectType(row),
            poidsKg: parseFloat(row['Poids'] || row['Poids (kg)'] || row['poids'] || 0),
            surfaceM2: parseFloat(row['Surface'] || row['Surface (m²)'] || row['surface'] || 0),
            dateLivraison: parseDate(row['Date Livraison'] || row['Date'] || row['date_livraison']),
            moisImport: new Date().toISOString().slice(0, 7),
            facturable: false, // Sera déterminé selon les critères
            facture: false,
            moisFacturation: null,
            avancements: {}, // { "2024-01": 30, "2024-02": 60, ... }
          };

          // Auto-détection du type basé sur les données
          if (plan.type === 'HA' && plan.surfaceM2 > 0 && plan.poidsKg === 0) {
            plan.type = 'TS';
          }

          return plan;
        }).filter(plan => plan.numeroPlan && (plan.poidsKg > 0 || plan.surfaceM2 > 0));

        resolve(plans);
      } catch (error) {
        reject(new Error(`Erreur de parsing Excel: ${error.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsArrayBuffer(file);
  });
}

function generatePlanId(row) {
  const num = row['Numéro Plan'] || row['N° Plan'] || row['Plan'] || row['numero_plan'] || '';
  const date = new Date().getTime();
  return `${num}-${date}-${Math.random().toString(36).substr(2, 9)}`;
}

function detectType(row) {
  const type = (row['Type'] || row['type'] || '').toUpperCase();
  if (type.includes('TS') || type.includes('TREILLIS')) return 'TS';
  if (type.includes('HA') || type.includes('ACIER')) return 'HA';
  // Par défaut, on regarde les colonnes présentes
  if (row['Surface'] || row['Surface (m²)']) return 'TS';
  return 'HA';
}

function parseDate(dateValue) {
  if (!dateValue) return new Date().toISOString().slice(0, 10);

  // Si c'est un nombre Excel (jours depuis 1900)
  if (typeof dateValue === 'number') {
    const date = XLSX.SSF.parse_date_code(dateValue);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  // Si c'est une string, essayer de parser
  try {
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch (e) {
    // ignore
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Génère un fichier Excel template
 */
export function generateTemplate() {
  const template = [
    {
      'Numéro Plan': 'EX-001',
      'Désignation': 'Fondations bâtiment A',
      'Type': 'HA',
      'Poids (kg)': 1500,
      'Surface (m²)': '',
      'Date Livraison': '2024-01-15'
    },
    {
      'Numéro Plan': 'EX-002',
      'Désignation': 'Dalle niveau 0',
      'Type': 'TS',
      'Poids (kg)': '',
      'Surface (m²)': 250,
      'Date Livraison': '2024-01-20'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plans');
  XLSX.writeFile(wb, 'template_plans.xlsx');
}
