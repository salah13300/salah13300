import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY manquant dans les variables d'environnement");
}

// La clé secrète ne doit JAMAIS être exposée côté client (pas de préfixe NEXT_PUBLIC_)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});
