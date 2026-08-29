import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

// POST /api/portal
// body: { email }
// Renvoie l'URL du portail client Stripe où l'utilisateur peut lui-même
// mettre à jour sa carte, changer/résilier son abonnement, voir ses factures.
// On ne code AUCUNE de ces actions nous-mêmes : Stripe s'en charge.
export async function POST(request: Request) {
  const { email } = await request.json();

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
