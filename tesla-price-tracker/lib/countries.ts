// Liste des marchés européens suivis.
// "code" = code pays utilisé par Tesla dans ses URLs (ex: tesla.com/fr_fr/...)
// "locale" = locale utilisée par le configurateur Tesla (pas la langue du site)
// "teslaMarket"/"teslaLanguage" = paramètres market/language attendus par
//   l'API d'inventaire Tesla (lib/scraper.ts) — vérifiés contre le mapping du
//   paquet open source teslahunt/inventory (src/inventories/index.js).
// "anchor" = coordonnées + code postal d'une grande ville du pays, utilisés
//   comme point de recherche géographique par l'API (elle ne fait pas de
//   recherche "pays entier" nativement) — combinés à un "range" large dans
//   lib/scraper.ts. Codes postaux non vérifiés individuellement contre
//   l'API réelle (accès réseau bloqué depuis cet environnement) : si un
//   marché renvoie 0 résultat de façon persistante, essayer un autre code
//   postal de ce pays.
export const COUNTRIES = [
  { code: "FR", name: "France", locale: "fr_FR", currency: "EUR", teslaMarket: "FR", teslaLanguage: "fr", anchor: { lat: 48.8566, lng: 2.3522, zip: "75001" } },
  { code: "DE", name: "Allemagne", locale: "de_DE", currency: "EUR", teslaMarket: "DE", teslaLanguage: "de", anchor: { lat: 52.52, lng: 13.405, zip: "10115" } },
  { code: "BE", name: "Belgique", locale: "fr_BE", currency: "EUR", teslaMarket: "BE", teslaLanguage: "nl", anchor: { lat: 50.8503, lng: 4.3517, zip: "1000" } },
  { code: "NL", name: "Pays-Bas", locale: "nl_NL", currency: "EUR", teslaMarket: "NL", teslaLanguage: "nl", anchor: { lat: 52.3676, lng: 4.9041, zip: "1011" } },
  { code: "ES", name: "Espagne", locale: "es_ES", currency: "EUR", teslaMarket: "ES", teslaLanguage: "es", anchor: { lat: 40.4168, lng: -3.7038, zip: "28001" } },
  { code: "IT", name: "Italie", locale: "it_IT", currency: "EUR", teslaMarket: "IT", teslaLanguage: "it", anchor: { lat: 41.9028, lng: 12.4964, zip: "00100" } },
  { code: "AT", name: "Autriche", locale: "de_AT", currency: "EUR", teslaMarket: "AT", teslaLanguage: "de", anchor: { lat: 48.2082, lng: 16.3738, zip: "1010" } },
  { code: "PT", name: "Portugal", locale: "pt_PT", currency: "EUR", teslaMarket: "PT", teslaLanguage: "pt", anchor: { lat: 38.7223, lng: -9.1393, zip: "1000" } },
  { code: "IE", name: "Irlande", locale: "en_IE", currency: "EUR", teslaMarket: "IE", teslaLanguage: "en", anchor: { lat: 53.3498, lng: -6.2603, zip: "D01" } },
  { code: "DK", name: "Danemark", locale: "da_DK", currency: "DKK", teslaMarket: "DK", teslaLanguage: "da", anchor: { lat: 55.6761, lng: 12.5683, zip: "1050" } },
  { code: "SE", name: "Suède", locale: "sv_SE", currency: "SEK", teslaMarket: "SE", teslaLanguage: "sv", anchor: { lat: 59.3293, lng: 18.0686, zip: "11121" } },
  { code: "PL", name: "Pologne", locale: "pl_PL", currency: "PLN", teslaMarket: "PL", teslaLanguage: "pl", anchor: { lat: 52.2297, lng: 21.0122, zip: "00-001" } },
  { code: "GB", name: "Royaume-Uni", locale: "en_GB", currency: "GBP", teslaMarket: "GB", teslaLanguage: "en", anchor: { lat: 51.5074, lng: -0.1278, zip: "SW1A" } },
] as const;

// "teslaModel" = code modèle attendu par l'API d'inventaire Tesla (vérifié :
// ms/mx/m3/my/ct dans plusieurs scrapers open source). Le Cybertruck n'est
// pour l'instant pas vendu en Europe : les requêtes le concernant renverront
// probablement 0 résultat sur ces marchés, ce qui est normal.
export const MODELS = [
  { slug: "model-3", name: "Model 3", teslaModel: "m3" },
  { slug: "model-y", name: "Model Y", teslaModel: "my" },
  { slug: "model-s", name: "Model S", teslaModel: "ms" },
  { slug: "model-x", name: "Model X", teslaModel: "mx" },
  { slug: "cybertruck", name: "Cybertruck", teslaModel: "ct" },
] as const;
