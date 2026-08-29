import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

// POST /api/checkout
// body: { email }
// Crée (ou récupère) l'utilisateur, puis crée une session Stripe Checkout
// et renvoie l'URL vers laquelle rediriger l'utilisateur pour payer.
// Le formulaire de carte bancaire est entièrement géré par Stripe :
// aucune donnée bancaire ne transite par ce serveur.
export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email requis" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.stripeCustomerId ? undefined : email,
    customer: user.stripeCustomerId ?? undefined,
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID, // prix récurrent 3,99€/mois créé dans le dashboard Stripe
        quantity: 1,
      },
    ],
    // On retrouve l'utilisateur côté webhook grâce à ces métadonnées
    client_reference_id: user.id,
    success_url: `${process.env.APP_URL}/abonnement/succes`,
    cancel_url: `${process.env.APP_URL}/abonnement/annule`,
  });

  return NextResponse.json({ url: session.url });
}
