import { z } from "zod";

function isAtLeast18(dateStr: string): boolean {
  const birth = new Date(dateStr);
  if (Number.isNaN(birth.getTime())) return false;
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
  return birth <= eighteenYearsAgo;
}

export const registerSchema = z.object({
  email: z.string().email("Email invalide."),
  password: z.string().min(10, "Le mot de passe doit contenir au moins 10 caractères."),
  role: z.enum(["FAN", "CREATOR"]),
  birthdate: z
    .string()
    .refine(isAtLeast18, "Vous devez avoir 18 ans révolus pour vous inscrire."),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: "Vous devez accepter les CGU pour continuer." }),
  }),
});

export const creatorProfileSchema = z.object({
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, "Lettres minuscules, chiffres et underscore uniquement."),
  displayName: z.string().min(2).max(60),
  bio: z.string().max(1000).default(""),
  subscriptionPriceCents: z.number().int().min(199).max(50000),
  contractAccepted: z.literal(true, {
    errorMap: () => ({ message: "La signature du contrat de cession/consentement est obligatoire." }),
  }),
  iban: z.string().min(10, "IBAN requis pour les reversements."),
});

export const contentSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).default(""),
  mediaUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  visibility: z.enum(["PUBLIC_TEASER", "SUBSCRIBERS", "PAY_PER_VIEW"]),
  priceCents: z.number().int().min(0).max(100000).default(0),
});
