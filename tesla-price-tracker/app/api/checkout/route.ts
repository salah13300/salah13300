import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { checkoutSchema } from "@/lib/validation";

// POST /api/checkout
// body: { email }
// Crée (ou récupère) l'utilisateur, puis crée une session Stripe Checkout
// et renvoie l'URL vers laquelle rediriger l'utilisateur pour payer.
// Le formulaire de carte bancaire est entièrement géré par Stripe :
// aucune donnée bancaire ne transite par ce serveur.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  const { email } = parsed.data;

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
