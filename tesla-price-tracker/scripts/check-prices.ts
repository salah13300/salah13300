import { checkAllPrices, closeBrowser } from "../lib/priceCheck";

// Seuls Model 3 et Model Y sont commandables neufs en Europe actuellement
// (voir lib/scraper.ts) : un échec sur model-s/model-x/cybertruck est le
// comportement attendu (redirection vers l'occasion, pas de page
// configurateur), pas une vraie panne. Avant le 20/09/2026, le script
// sortait en erreur (exit 1) sur N'IMPORTE QUEL échec, y compris ceux-là —
// ce qui faisait afficher un ❌ rouge sur GitHub Actions tous les jours,
// même les jours où toutes les données Model 3/Y avaient bien été
// collectées, masquant les vraies pannes derrière du bruit permanent.
const CRITICAL_MODELS = new Set(["model-3", "model-y"]);

checkAllPrices()
  .then(async (result) => {
    console.log(`Terminé : ${result.checked} relevés effectués.`);
    if (result.failed.length > 0) {
      console.error(`${result.failed.length} échec(s) :`, result.failed);
    }

    const criticalFailures = result.failed.filter((f) => CRITICAL_MODELS.has(f.model));
    await closeBrowser();
    process.exit(criticalFailures.length > 0 ? 1 : 0);
  })
  .catch(async (err) => {
    console.error(err);
    await closeBrowser();
    process.exit(1);
  });
