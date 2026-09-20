// Script de validation ponctuel (voir .github/workflows/validate-ai-agent.yml) :
// vérifie que fetchPricesForModel (Playwright + repli IA, lib/scraper.ts)
// fonctionne réellement contre tesla.com dans un environnement GitHub
// Actions, sans toucher à la base de données.
import { fetchRenderedHtmlBrowser, buildTeslaConfiguratorUrl, closeBrowser } from "../lib/scraper";

const CASES: [string, string][] = [
  ["FR", "model-3"],
  ["DE", "model-y"],
];

(async () => {
  for (const [country, model] of CASES) {
    const url = buildTeslaConfiguratorUrl(country, model);
    console.log(`=== ${model}/${country} (${url}) ===`);
    try {
      const html = await fetchRenderedHtmlBrowser(url);
      console.log("HTML length:", html.length);
      console.log("Contient 'cpr_chlge' (challenge Akamai):", html.includes("cpr_chlge"));
      console.log("Contient 'Access Denied':", html.toLowerCase().includes("access denied"));
      console.log("Snippet:", html.slice(0, 1500).replace(/\s+/g, " "));
    } catch (err) {
      console.log("ERREUR:", err instanceof Error ? err.message : String(err));
    }
  }
  await closeBrowser();
})();
