import { NextResponse } from "next/server";

// Route de diagnostic temporaire (à supprimer une fois le nouveau scraper
// basé sur la page configurateur écrit) : rend une page tesla.com donnée
// via ScraperAPI (render=true, pour laisser le temps à l'appel JS de
// pricing de se terminer) et extrait les motifs ressemblant à un prix, pour
// repérer où et sous quelle forme le prix apparaît dans le HTML final.
export const maxDuration = 90;

// Restreint à tesla.com : évite qu'un appelant fasse relayer n'importe
// quelle URL arbitraire via notre clé ScraperAPI (SSRF/abus de crédits).
const ALLOWED_HOST = "www.tesla.com";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") ?? "/fr_fr/model3/design";

  if (!path.startsWith("/")) {
    return NextResponse.json({ error: "'path' doit commencer par /" }, { status: 400 });
  }

  const apiKey = process.env.SCRAPERAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SCRAPERAPI_KEY manquant" }, { status: 500 });
  }

  const targetUrl = `https://${ALLOWED_HOST}${path}`;
  const proxyUrl = `https://api.scraperapi.com/?api_key=${apiKey}&ultra_premium=true&render=true&url=${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(85000) });
    const html = await response.text();

    // Motifs plausibles pour un prix affiché en euros (espaces normaux et
    // insécables), ex. "36 733 €" ou "36733€".
    const priceMatches = [
      ...html.matchAll(/[\d][\d\s .,]{2,12}\s?€/g),
    ].map((m) => m[0]);

    // Contexte textuel autour de "Prix d'achat" / "purchase" pour situer où
    // le prix apparaît dans la structure de la page.
    const contextMatches = [
      ...html.matchAll(/.{80}(Prix d.achat|purchase[_ -]?price|BasePrice).{80}/gi),
    ].map((m) => m[0]);

    return NextResponse.json({
      targetUrl,
      scraperApiStatus: response.status,
      htmlLength: html.length,
      priceMatchesSample: [...new Set(priceMatches)].slice(0, 30),
      contextMatchesSample: contextMatches.slice(0, 10),
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
