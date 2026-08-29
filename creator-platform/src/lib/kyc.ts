/**
 * Module de vérification d'identité (KYC) et de majorité.
 *
 * ⚠️ MOCK — à remplacer avant tout lancement public.
 *
 * Le cahier des charges (sections 0, 3.2, 4.3, 9) impose :
 *   - une vérification d'identité et de majorité infalsifiable pour chaque créateur
 *   - une vérification de majorité pour chaque client avant accès au contenu adulte
 *   - un stockage des pièces d'identité externalisé chez un prestataire certifié
 *     (Sumsub, Veriff, Yoti, Onfido — voir section 10, étape 3), jamais en interne.
 *
 * Cette implémentation ne fait AUCUNE vérification réelle : elle simule le contrat
 * d'API qu'un vrai prestataire exposerait (soumission -> statut asynchrone -> callback),
 * pour permettre de développer le reste du produit en parallèle des démarches
 * administratives (section 10, étape 5). Elle ne doit jamais être utilisée en production.
 */

export type KycCheckKind = "age_verification" | "creator_full_kyc";

export interface KycSubmissionInput {
  userId: string;
  kind: KycCheckKind;
  // En prod : documents envoyés directement au prestataire (jamais stockés chez nous), pas ici.
  declaredBirthdate?: string;
}

export interface KycSubmissionResult {
  provider: string;
  reference: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

const MOCK_PROVIDER_NAME = "mock-kyc-provider";

/**
 * Simule la soumission d'une vérification à un prestataire tiers.
 * Dans une vraie intégration : appel API (ex. Sumsub applicant creation) + upload documents
 * directement vers le prestataire (webhook / SDK côté client), rien ne transite par notre backend.
 */
export async function submitKycCheck(
  input: KycSubmissionInput
): Promise<KycSubmissionResult> {
  const reference = `mock_${input.kind}_${input.userId}_${Date.now()}`;

  // Règle métier simulée : on "auto-approuve" en mock pour permettre de tester les parcours,
  // mais en prod ce sera toujours PENDING en attendant le callback du prestataire + revue humaine.
  return {
    provider: MOCK_PROVIDER_NAME,
    reference,
    status: "APPROVED",
  };
}

/**
 * Simule la réception d'un webhook de statut de la part du prestataire.
 * À remplacer par la vérification de signature du vrai webhook (HMAC) en prod.
 */
export function verifyMockWebhookSignature(_payload: unknown, _signature: string | null): boolean {
  // MOCK : toujours vrai. En prod, vérifier obligatoirement la signature avant de faire confiance au payload.
  return true;
}
