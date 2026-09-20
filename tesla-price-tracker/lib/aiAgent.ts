/**
 * Agent IA (20/09/2026) : remplace entièrement le scraping local.
 *
 * Historique : ScraperAPI (proxy résidentiel payant, $49/mois) a d'abord été
 * abandonné au profit d'un navigateur headless local (Playwright, gratuit).
 * Mais un test en conditions réelles sur GitHub Actions a confirmé que
 * tesla.com bloque directement les IP des runners au niveau Akamai (réponse
 * "Access Denied" immédiate, ~300 caractères, avant même le rendu JS) — un
 * navigateur local ne change rien à ça, seul un proxy à IP résidentielle
 * réglait ce point.
 *
 * Décision (utilisateur, 20/09/2026) : plus aucun scraping local, ni proxy —
 * c'est l'agent IA lui-même qui va chercher la page, via l'outil serveur
 * `web_fetch` de Claude (exécuté sur l'infrastructure Anthropic, pas depuis
 * les IP GitHub Actions bloquées). Claude récupère la page puis appelle
 * `extract_price` avec le prix trouvé. Un seul appel API fait tout le
 * travail (récupération + extraction), plus besoin de regex ni de
 * navigateur.
 *
 * Modèle : Claude Sonnet 5 pour la récupération+extraction (fetchPriceWithAIAgent)
 * — web_fetch (variante 20260209) n'est pas documenté comme supporté sur
 * Haiku 4.5, et c'est le mécanisme de collecte principal, la fiabilité prime
 * ici. Claude Haiku 4.5 reste utilisé pour checkPriceAnomaly (simple
 * jugement textuel, pas d'outil serveur, tâche à fort volume où le coût le
 * plus bas est justifié).
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const AGENT_MODEL = "claude-sonnet-5";
const ANOMALY_MODEL = "claude-haiku-4-5";

interface ExtractPriceInput {
  found: boolean;
  price?: number;
  reason?: string;
}

const EXTRACT_PRICE_TOOL: Anthropic.Tool = {
  name: "extract_price",
  description:
    "Renvoie le prix de base (la configuration la moins chère) du véhicule Tesla neuf trouvé sur la page récupérée, ou found=false si le véhicule n'est pas commandable neuf sur ce marché (redirection vers l'occasion, page d'erreur, page vide).",
  input_schema: {
    type: "object",
    properties: {
      found: {
        type: "boolean",
        description: "true si un prix de véhicule neuf plausible a été identifié sur la page",
      },
      price: {
        type: "number",
        description:
          "Le prix de base le plus bas trouvé sur la page, en unité monétaire pleine (ex: 39990), sans séparateurs ni symbole monétaire",
      },
      reason: {
        type: "string",
        description: "Courte explication, surtout utile si found=false",
      },
    },
    required: ["found"],
    additionalProperties: false,
  },
  strict: true,
};

// Récupère et extrait le prix de base d'une page configurateur Tesla en un
// seul agent IA : Claude appelle lui-même web_fetch (côté serveur Anthropic,
// pas depuis nos propres IP) puis extract_price avec le résultat. Renvoie
// null si aucun prix n'a pu être extrait (page indisponible, modèle non
// commandable sur ce marché, échec de l'appel IA...).
export async function fetchPriceWithAIAgent(url: string, currency: string): Promise<number | null> {
  const tools = [
    { type: "web_fetch_20260209" as const, name: "web_fetch" as const, max_uses: 3, max_content_tokens: 8000 },
    EXTRACT_PRICE_TOOL,
  ];

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content:
        `Utilise l'outil web_fetch pour récupérer cette page : ${url}\n\n` +
        `C'est la page configurateur d'un véhicule Tesla neuf, avec le prix affiché en ${currency}. Une fois la ` +
        `page récupérée, appelle extract_price avec le prix de base (la configuration/finition la moins chère), ` +
        `en ignorant les mensualités de leasing, frais de dossier, bonus/malus écologique. Si le véhicule n'est ` +
        `pas commandable neuf sur ce marché (redirection vers l'inventaire d'occasion, page d'erreur, page vide), ` +
        `appelle extract_price avec found=false.`,
    },
  ];

  try {
    // web_fetch peut nécessiter plusieurs aller-retours gérés côté serveur
    // avant que Claude n'appelle extract_price (voir stop_reason
    // "pause_turn" dans la doc Anthropic) — on relance tant que ce n'est
    // pas encore le cas, dans une limite de tours pour éviter une boucle
    // infinie en cas de souci inattendu.
    for (let turn = 0; turn < 5; turn++) {
      const response = await client.messages.create({
        model: AGENT_MODEL,
        max_tokens: 2048,
        tools,
        messages,
      });

      const toolUse = response.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "extract_price"
      );
      if (toolUse) {
        const input = toolUse.input as ExtractPriceInput;
        if (!input.found || typeof input.price !== "number") return null;
        return input.price;
      }

      if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
        continue;
      }

      // Terminé sans appeler extract_price (réponse texte, refus...) :
      // rien d'exploitable.
      return null;
    }

    console.error(`Agent IA : trop de tours sans réponse exploitable pour ${url}`);
    return null;
  } catch (err) {
    console.error(`Échec de l'agent IA pour ${url}:`, err);
    return null;
  }
}

interface AnomalyVerdict {
  plausible: boolean;
  reason: string;
}

const ANOMALY_TOOL: Anthropic.Tool = {
  name: "judge_price_change",
  description:
    "Juge si un changement de prix relevé pour un véhicule Tesla est un ajustement catalogue plausible, ou ressemble à une erreur d'extraction.",
  input_schema: {
    type: "object",
    properties: {
      plausible: {
        type: "boolean",
        description: "true si le changement ressemble à un vrai ajustement de prix catalogue Tesla",
      },
      reason: {
        type: "string",
        description: "Courte explication de la décision",
      },
    },
    required: ["plausible", "reason"],
    additionalProperties: false,
  },
  strict: true,
};

// Utilisé par lib/priceCheck.ts uniquement quand l'écart avec le relevé
// précédent dépasse un seuil (voir ANOMALY_THRESHOLD) — la plupart des
// relevés quotidiens ne changent pas ou peu, pas besoin d'appeler l'IA à
// chaque fois. En cas d'échec de l'appel IA (réseau, quota...), on considère
// le changement plausible par défaut : mieux vaut risquer une fausse alerte
// occasionnelle qu'en bloquer une vraie à cause d'un souci indépendant.
export async function checkPriceAnomaly(params: {
  country: string;
  model: string;
  trim: string;
  currency: string;
  previousPriceCents: number;
  newPriceCents: number;
}): Promise<AnomalyVerdict> {
  try {
    const response = await client.messages.create({
      model: ANOMALY_MODEL,
      max_tokens: 300,
      tools: [ANOMALY_TOOL],
      tool_choice: { type: "tool", name: "judge_price_change" },
      messages: [
        {
          role: "user",
          content:
            `Marché: ${params.country}, modèle Tesla: ${params.model} (finition: ${params.trim}), devise: ${params.currency}.\n` +
            `Ancien prix relevé: ${(params.previousPriceCents / 100).toFixed(2)} ${params.currency}\n` +
            `Nouveau prix relevé: ${(params.newPriceCents / 100).toFixed(2)} ${params.currency}\n\n` +
            `Ce changement est-il un ajustement de prix catalogue Tesla plausible (Tesla ajuste ses prix ` +
            `de temps en temps, mais rarement de façon extrême d'un jour à l'autre), ou ressemble-t-il à ` +
            `une erreur d'extraction (ex: mensualité de leasing capturée au lieu du prix d'achat, mauvaise ` +
            `devise, prix tronqué ou dupliqué) ?`,
        },
      ],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    if (!toolUse) {
      return { plausible: true, reason: "Pas de réponse IA exploitable, valeur conservée par défaut" };
    }

    const input = toolUse.input as AnomalyVerdict;
    return { plausible: input.plausible, reason: input.reason ?? "" };
  } catch (err) {
    console.error("Échec de l'analyse IA de l'écart de prix:", err);
    return { plausible: true, reason: "Appel IA échoué, valeur conservée par défaut" };
  }
}
