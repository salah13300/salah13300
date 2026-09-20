// Script de test ponctuel (voir .github/workflows/test-playwright.yml) :
// vérifie si un navigateur headless Playwright, sans proxy payant, suffit à
// charger la page configurateur Tesla et à en extraire un prix.
const { chromium } = require("playwright");

const TARGETS = [
  "https://www.tesla.com/fr_fr/model3/design",
  "https://www.tesla.com/fr_fr/modely/design",
];

const euroSign = String.fromCharCode(0x20ac);
const priceRegex = new RegExp("[0-9](?:[0-9\\s.,]|&nbsp;)*\\s?" + euroSign, "g");

(async () => {
  const browser = await chromium.launch({ headless: true });
  for (const url of TARGETS) {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    console.log("=== " + url + " ===");
    try {
      const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      console.log("STATUS:", resp ? resp.status() : "no response");
      await page.waitForTimeout(4000);
      const html = await page.content();
      console.log("HTML length:", html.length);
      const matches = [...html.matchAll(priceRegex)].map((m) => m[0]);
      console.log("Price-like matches:", JSON.stringify([...new Set(matches)].slice(0, 10)));
      console.log("Looks like Akamai challenge:", html.includes("cpr_chlge") || html.length < 5000);
    } catch (e) {
      console.log("ERROR:", e.message);
    }
    await page.close();
  }
  await browser.close();
})();
