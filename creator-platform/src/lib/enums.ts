/**
 * SQLite (utilisé en dev/démo, voir README) ne supporte pas les enums natifs de Prisma.
 * On modélise donc ces champs comme des String en base, avec ces constantes côté application
 * pour garder la sécurité de typage. En migrant vers PostgreSQL (cible prod, section 6 du cahier
 * des charges), ces champs pourront redevenir de vrais enums Prisma sans changer l'API.
 */

export const Role = {
  FAN: "FAN",
  CREATOR: "CREATOR",
  MODERATOR: "MODERATOR",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const KycStatus = {
  NOT_STARTED: "NOT_STARTED",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type KycStatus = (typeof KycStatus)[keyof typeof KycStatus];

export const CreatorProfileStatus = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
} as const;
export type CreatorProfileStatus = (typeof CreatorProfileStatus)[keyof typeof CreatorProfileStatus];

export const ContentVisibility = {
  PUBLIC_TEASER: "PUBLIC_TEASER",
  SUBSCRIBERS: "SUBSCRIBERS",
  PAY_PER_VIEW: "PAY_PER_VIEW",
} as const;
export type ContentVisibility = (typeof ContentVisibility)[keyof typeof ContentVisibility];

export const TransactionType = {
  WALLET_TOPUP: "WALLET_TOPUP",
  SUBSCRIPTION: "SUBSCRIPTION",
  PPV_UNLOCK: "PPV_UNLOCK",
  TIP: "TIP",
  CUSTOM_REQUEST_ESCROW: "CUSTOM_REQUEST_ESCROW",
  CUSTOM_REQUEST_RELEASE: "CUSTOM_REQUEST_RELEASE",
  PAYOUT: "PAYOUT",
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionStatus = {
  PENDING: "PENDING",
  ESCROWED: "ESCROWED",
  COMPLETED: "COMPLETED",
  REFUNDED: "REFUNDED",
  FAILED: "FAILED",
} as const;
export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];

export const CustomRequestStatus = {
  REQUESTED: "REQUESTED",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  COUNTER_OFFERED: "COUNTER_OFFERED",
  DELIVERED: "DELIVERED",
  RELEASED: "RELEASED",
  CANCELLED: "CANCELLED",
} as const;
export type CustomRequestStatus = (typeof CustomRequestStatus)[keyof typeof CustomRequestStatus];
