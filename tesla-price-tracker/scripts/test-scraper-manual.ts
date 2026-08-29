import { fetchPricesForModel } from "../lib/scraper";

const country = process.argv[2] ?? "FR";
const model = process.argv[3] ?? "model-3";

fetchPricesForModel(country, model)
  .then((prices) => {
    console.log(`OK: ${prices.length} résultat(s)`);
    console.log(JSON.stringify(prices, null, 2));
  })
  .catch((err) => {
    console.error("ÉCHEC:", err);
    process.exit(1);
  });
