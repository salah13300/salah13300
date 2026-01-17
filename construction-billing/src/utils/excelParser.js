import * as XLSX from 'xlsx';

/**
 * Parse un fichier Excel de plans HA (format réel)
 * Colonnes : Code, Code chantier, Code client, Nom client, Nom chantier,
 * No/ind. plan, Désignation, Poids ASS commandé, Poids CF commandé, Usine, Date prévue,
 * BL. No, Poids ASS facturé, Poids CF facturé
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
          // Mapping des colonnes vers notre structure
          const plan = {
            id: generatePlanId(row, index),
            code: getString(row, ['Code']),
            codeChantier: getString(row, ['Code chantier']),
            codeClient: getString(row, ['Code client']),
            nomClient: getString(row, ['Nom client']),
            nomChantier: getString(row, ['Nom chantier']),
            numeroPlan: getString(row, ['No/ind. plan', 'N°/ind. plan', 'No/ind plan', 'Numéro Plan']) || `PLAN-${index + 1}`,
            designation: getString(row, ['Désignation', 'Designation']),

            // Poids commandés (HA)
            poidsASSCommande: getNumber(row, ['Poids ASS commandé', 'Poids ASS commande', 'Poids ASS']),
            poidsCFCommande: getNumber(row, ['Poids CF commandé', 'Poids CF commande', 'Poids CF']),

            usine: getString(row, ['Usine']),
            datePrevue: parseDate(row['Date prévue'] || row['Date prevue'] || row['Date Livraison']),
            blNumero: getString(row, ['BL. No', 'BL No', 'BL']),

            // Poids facturés
            poidsASSFacture: getNumber(row, ['Poids ASS facturé', 'Poids ASS facture']),
            poidsCFFacture: getNumber(row, ['Poids CF facturé', 'Poids CF facture']),

            // Pour treillis soudés
            surfaceTS: getNumber(row, ['Surface', 'Surface (m²)']),
            quantiteTS: getNumber(row, ['Quantité', 'Qté']),

            type: 'HA', // Sera mis à jour si c'est un TS
            moisImport: new Date().toISOString().slice(0, 7),
            avancements: {}, // { "2024-01": { ass: 30, cf: 30 }, ... }
          };

          // Détection du type
          if (plan.surfaceTS > 0 || plan.quantiteTS > 0) {
            plan.type = 'TS';
          }

          return plan;
        }).filter(plan =>
          plan.numeroPlan &&
          (plan.poidsASSCommande > 0 || plan.poidsCFCommande > 0 || plan.surfaceTS > 0 || plan.quantiteTS > 0)
        );

        resolve(plans);
      } catch (error) {
        reject(new Error(`Erreur de parsing Excel: ${error.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'));
    reader.readAsArrayBuffer(file);
  });
}

// Helpers pour extraire les valeurs avec plusieurs noms de colonnes possibles
function getString(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') {
      return String(row[key]);
    }
  }
  return '';
}

function getNumber(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== '') {
      const val = parseFloat(row[key]);
      if (!isNaN(val)) return val;
    }
  }
  return 0;
}

function generatePlanId(row, index) {
  const code = row['Code'] || '';
  const plan = row['No/ind. plan'] || row['N°/ind. plan'] || '';
  const date = new Date().getTime();
  return `${code}-${plan}-${date}-${Math.random().toString(36).substr(2, 9)}`;
}

function parseDate(dateValue) {
  if (!dateValue) return new Date().toISOString().slice(0, 10);

  // Si c'est un nombre Excel (jours depuis 1900)
  if (typeof dateValue === 'number') {
    const date = XLSX.SSF.parse_date_code(dateValue);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  // Si c'est une string, essayer de parser
  if (typeof dateValue === 'string') {
    // Format DD-MM-YYYY ou DD/MM/YYYY
    const parts = dateValue.split(/[-/]/);
    if (parts.length === 3) {
      const day = parts[0];
      const month = parts[1];
      const year = parts[2];
      if (day.length <= 2 && month.length <= 2 && year.length === 4) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    try {
      const d = new Date(dateValue);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    } catch (e) {
      // ignore
    }
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Génère un fichier Excel template correspondant au format attendu
 */
export function generateTemplate() {
  const template = [
    {
      'Code': 'BATCRE-0044',
      'Code chantier': 'BATCRE',
      'Code client': 'BATARM',
      'Nom client': 'BATI ARMA CRETEIL',
      'Nom chantier': 'BATI ARMA CRETEIL',
      'No/ind. plan': 'BA145.2 / A',
      'Désignation': 'ZONE 2 PH.E+1 POUTRES',
      'Poids ASS commandé': 9156.57,
      'Poids CF commandé': 894.49,
      'Usine': 'ARMASEINE',
      'Date prévue': '13-01-2026',
      'BL. No': '2601047',
      'Poids ASS facturé': 9751.32,
      'Poids CF facturé': 1045.43
    },
    {
      'Code': 'ANGLEV-0070',
      'Code chantier': 'ANGLEV',
      'Code client': 'ANGEVI',
      'Nom client': 'ANGEVIN ILE DE FRANCE',
      'Nom chantier': 'ANGEVIN LEVALLOIS-PERRET STEELPOS',
      'No/ind. plan': 'PH.2 S/SOL POUTRE 33',
      'Désignation': '',
      'Poids ASS commandé': 0,
      'Poids CF commandé': 1333.95,
      'Usine': 'STEEL INDUSTRIE',
      'Date prévue': '08-12-2025',
      'BL. No': '2512062',
      'Poids ASS facturé': 0,
      'Poids CF facturé': 1375.43
    }
  ];

  const ws = XLSX.utils.json_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plans HA');
  XLSX.writeFile(wb, 'template_plans_ha.xlsx');
}
