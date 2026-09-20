/**
 * Agent IA (20/09/2026) : remplace ScraperAPI (abandonné, trop cher pour le
 * volume réel — ~26 relevés/jour Model 3 + Model Y). Deux rôles :
 *
 * 1. Repli d'extraction : si la regex de lib/scraper.ts (rapide, gratuite,
 *    fiable dans l'immense majorité des cas) ne trouve aucun prix plausible
 *    dans la page rendue, on passe les extraits candidats à Claude pour
 *    qu'il tranche — utile si Tesla change la structure de sa page.
 * 2. Analyse post-relevé : avant de déclencher une alerte de baisse de prix,
 *    si le nouveau prix diffère fortement du précédent relevé, on demande à
 *    Claude si ce changement ressemble à un vrai ajustement catalogue Tesla
 *    ou à une erreur d'extraction (ex: mensualité de leasing capturée au
 *    lieu du prix d'achat) — évite d'alerter des abonnés payants sur une
 *    valeur aberrante.
 *
 * Modèle : Haiku 4.5, volontairement — tâche d'extraction/classification
 * simple et à fort volume, le choix le moins cher est justifié ici (c'est
 * même le but recherché par l'utilisateur : réduire le coût par rapport à
 * ScraperAPI).
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const MODEL = "claude-haiku-4-5";

interface ExtractPriceInput {
  found: boolean;
  price?: number;
  reason?: string;
}

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_price",
  description:
    "Renvoie le prix de base (la configuration la moins chère) du véhicule Tesla trouvé dans les extraits fournis, ou found=false si aucun prix de véhicule neuf plausible n'est présent (page de redirection, modèle indisponible sur ce marché, erreur).",
  input_schema: {
    type: "object",
    properties: {
      found: {
        type: "boolean",
        description: "true si un prix de véhicule neuf plausible a été identifié",
      },
      price: {
        type: "number",
        description:
          "Le prix de base le plus bas parmi les extraits, en unité monétaire pleine (ex: 39990, pas 39990.00€ ni 3999000 centimes)",
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

// Repli d'extraction, utilisé uniquement quand la regex de scraper.ts ne
// trouve rien — voir fetchPricesForModel.
export async function extractPriceWithAI(
  candidateSnippets: string[],
  currency: string
): Promise<number | null> {
  if (candidateSnippets.length === 0) return null;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extract_price" },
      messages: [
        {
          role: "user",
          content:
            `Voici des extraits de texte pris sur une page configurateur Tesla (prix en ${currency}). ` +
            `Identifie le prix de base du véhicule (la configuration/finition la moins chère), en ignorant ` +
            `les mensualités de leasing, frais de dossier, bonus/malus écologique, ou tout montant qui n'est ` +
            `pas un prix d'achat de véhicule.\n\nExtraits:\n${candidateSnippets.join("\n---\n")}`,
        },
      ],
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );
    if (!toolUse) return null;

    const input = toolUse.input as ExtractPriceInput;
    if (!input.found || typeof input.price !== "number") return null;
    return input.price;
  } catch (err) {
    console.error("Échec de l'extraction IA du prix:", err);
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
      model: MODEL,
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
