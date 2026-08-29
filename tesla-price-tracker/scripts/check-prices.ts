import { checkAllPrices } from "../lib/priceCheck";

checkAllPrices()
  .then((result) => {
    console.log(`Terminé : ${result.checked} relevés effectués.`);
    if (result.failed.length > 0) {
      console.error(`${result.failed.length} échec(s) :`, result.failed);
    }
    process.exit(result.failed.length > 0 ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
