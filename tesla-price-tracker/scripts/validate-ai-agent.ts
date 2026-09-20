// Script de validation ponctuel (voir .github/workflows/validate-ai-agent.yml) :
// vérifie que fetchPricesForModel (Playwright + repli IA, lib/scraper.ts)
// fonctionne réellement contre tesla.com dans un environnement GitHub
// Actions, sans toucher à la base de données.
import { fetchPricesForModel, closeBrowser } from "../lib/scraper";

const CASES: [string, string][] = [
  ["FR", "model-3"],
  ["DE", "model-y"],
  ["ES", "model-s"], // attendu : 0 résultat (non commandable neuf, voir lib/scraper.ts)
];

(async () => {
  for (const [country, model] of CASES) {
    console.log(`=== ${model}/${country} ===`);
    try {
      const results = await fetchPricesForModel(country, model);
      console.log(JSON.stringify(results));
    } catch (err) {
      console.log("ERREUR:", err instanceof Error ? err.message : String(err));
    }
  }
  await closeBrowser();
})();
