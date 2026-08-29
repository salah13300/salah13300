import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getSessionEmail } from "@/lib/auth";

// POST /api/portal
// Renvoie l'URL du portail client Stripe où l'utilisateur peut lui-même
// mettre à jour sa carte, changer/résilier son abonnement, voir ses factures.
// On ne code AUCUNE de ces actions nous-mêmes : Stripe s'en charge.
// L'email vient de la session (cookie), jamais d'un champ envoyé par le
// client — sinon n'importe qui pourrait ouvrir le portail de facturation de
// n'importe quel abonné en connaissant juste son email.
export async function POST() {
  const email = getSessionEmail();

  if (!email) {
    return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { error: "Aucun abonnement trouvé pour cet email" },
      { status: 404 }
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.APP_URL}/compte`,
  });

  return NextResponse.json({ url: session.url });
}
