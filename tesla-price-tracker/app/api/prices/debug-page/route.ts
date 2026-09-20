import { NextResponse } from "next/server";
import { fetchPriceWithAIAgent } from "@/lib/aiAgent";

// Route de diagnostic : déclenche l'agent IA (lib/aiAgent.ts, Claude +
// web_fetch) sur une URL tesla.com donnée et renvoie le prix trouvé (ou
// null), pour vérifier manuellement que la récupération fonctionne sans
// attendre le prochain relevé quotidien.
export const maxDuration = 90;
export const dynamic = "force-dynamic";

// Restreint à tesla.com : évite qu'un appelant fasse relayer n'importe
// quelle URL arbitraire via notre clé Anthropic (abus de crédits).
const ALLOWED_HOST = "www.tesla.com";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path") ?? "/fr_fr/model3/design";
  const currency = searchParams.get("currency") ?? "EUR";

  if (!path.startsWith("/")) {
    return NextResponse.json({ error: "'path' doit commencer par /" }, { status: 400 });
  }

  const targetUrl = `https://${ALLOWED_HOST}${path}`;

  try {
    const price = await fetchPriceWithAIAgent(targetUrl, currency);
    return NextResponse.json({ targetUrl, currency, price });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
