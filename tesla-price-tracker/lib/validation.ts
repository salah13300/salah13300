import { z } from "zod";
import { COUNTRIES, MODELS } from "./countries";

const countryCodes = COUNTRIES.map((c) => c.code) as [string, ...string[]];
const modelSlugs = MODELS.map((m) => m.slug) as [string, ...string[]];

// .trim() + .toLowerCase() : deux emails qui ne diffèrent que par la casse
// ou des espaces ne doivent pas créer deux comptes distincts.
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const countrySchema = z.enum(countryCodes);
export const modelSchema = z.enum(modelSlugs);

export const checkoutSchema = z.object({
  email: emailSchema,
});

export const subscribeSchema = z.object({
  email: emailSchema,
  country: countrySchema,
  model: modelSchema,
  trim: z.string().trim().min(1).max(60).optional().nullable(),
});

export const pricesQuerySchema = z.object({
  country: countrySchema,
  model: modelSchema,
});
