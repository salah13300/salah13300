import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// IMPORTANT SÉCURITÉ :
// - On vérifie la signature du webhook avec STRIPE_WEBHOOK_SECRET.
//   Sans cette vérification, n'importe qui pourrait appeler cette URL et
//   prétendre qu'un paiement a eu lieu pour activer un compte gratuitement.
// - On ne fait JAMAIS confiance au contenu envoyé par le frontend pour
//   activer un abonnement : seul ce webhook, signé par Stripe, fait foi.

export async function POST(request: Request) {
  const body = await request.text(); // corps brut requis pour vérifier la signature
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Échec de vérification de la signature Stripe:", err);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      if (!userId) break;

      await prisma.user.update({
        where: { id: userId },
        data: {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          subscriptionStatus: "active",
        },
      });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.user.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { subscriptionStatus: subscription.status },
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await prisma.user.updateMany({
        where: { stripeCustomerId: invoice.customer as string },
        data: { subscriptionStatus: "past_due" },
      });
      break;
    }

    default:
      break; // on ignore les événements qu'on ne gère pas
  }

  return NextResponse.json({ received: true });
}
