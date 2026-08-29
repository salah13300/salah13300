/**
 * Module de paiement et wallet interne.
 *
 * ⚠️ MOCK — à remplacer avant tout lancement public.
 *
 * Le cahier des charges (sections 3.6, 4.1, 9) impose un prestataire de paiement
 * "high-risk / adult content" dédié (CCBill, Segpay, Epoch, Verotel...) : PAS Stripe
 * standard, pas de PAN stocké (PCI-DSS), 3D Secure, scoring anti-fraude.
 *
 * Cette implémentation simule un wallet interne crédité (le modèle recommandé en
 * section 3.6 pour fluidifier les micro-paiements) avec un solde stocké en base et
 * un plafond de rechargement fictif, sans jamais manipuler de vraie carte bancaire.
 * Aucune donnée de carte n'est demandée ni stockée ici.
 */

import { prisma } from "@/lib/prisma";
import { TransactionStatus, TransactionType } from "@/lib/enums";

export class InsufficientFundsError extends Error {
  constructor() {
    super("Solde du portefeuille insuffisant.");
    this.name = "InsufficientFundsError";
  }
}

/**
 * Simule un rechargement de wallet via le prestataire de paiement.
 * En prod : tokenisation carte côté prestataire + 3DS, jamais de PAN en clair ici.
 */
export async function mockTopUpWallet(userId: string, amountCents: number) {
  if (amountCents <= 0) throw new Error("Montant invalide.");

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { walletBalanceCents: { increment: amountCents } },
    });

    const transaction = await tx.transaction.create({
      data: {
        type: TransactionType.WALLET_TOPUP,
        status: TransactionStatus.COMPLETED,
        amountCents,
        buyerId: userId,
        metadata: JSON.stringify({ provider: "mock-payment-provider" }),
      },
    });

    return { user, transaction };
  });
}

interface DebitWalletInput {
  userId: string;
  amountCents: number;
  type: TransactionType;
  creatorId?: string;
  metadata?: Record<string, unknown>;
  status?: TransactionStatus;
}

/**
 * Débite le wallet d'un utilisateur pour un achat (abonnement, PPV, tip, escrow...).
 * Lève InsufficientFundsError si le solde est insuffisant (le client est alors renvoyé
 * vers un rechargement — en prod, on tenterait plutôt un paiement carte direct via le PSP).
 */
export async function debitWallet({
  userId,
  amountCents,
  type,
  creatorId,
  metadata,
  status = TransactionStatus.COMPLETED,
}: DebitWalletInput) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.walletBalanceCents < amountCents) {
      throw new InsufficientFundsError();
    }

    await tx.user.update({
      where: { id: userId },
      data: { walletBalanceCents: { decrement: amountCents } },
    });

    const transaction = await tx.transaction.create({
      data: {
        type,
        status,
        amountCents,
        buyerId: userId,
        creatorId,
        metadata: JSON.stringify(metadata ?? {}),
      },
    });

    return transaction;
  });
}

/**
 * Calcule la commission plateforme dégressive selon le volume cumulé du créateur
 * (différenciation produit, section 7.5 / 8). Barème simplifié pour le MVP.
 */
export function computeCommissionRateBps(lifetimeRevenueCents: number): number {
  if (lifetimeRevenueCents > 500_000_00) return 1200; // 12% au-delà de 500k€ générés
  if (lifetimeRevenueCents > 50_000_00) return 1500; // 15% au-delà de 50k€
  return 2000; // 20% commission de base, dégressive avec le volume
}
