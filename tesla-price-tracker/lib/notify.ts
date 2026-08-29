import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPriceDropAlert(params: {
  to: string;
  model: string;
  trim: string;
  country: string;
  newPriceCents: number;
  currency: string;
}) {
  const price = (params.newPriceCents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: params.currency,
  });

  await resend.emails.send({
    // "onboarding@resend.dev" fonctionne sans configuration (utile pour
    // tester), mais Resend le limite en envoi et en délivrabilité réelle.
    // Dès qu'un domaine est vérifié dans Resend (menu Domaines), remplace
    // par une adresse de ce domaine, ex: "alertes@ton-domaine.com".
    from: "onboarding@resend.dev",
    to: params.to,
    subject: `Nouveau prix le plus bas : ${params.model} (${params.trim}) à ${price}`,
    html: `
      <p>Bonne nouvelle !</p>
      <p>Le <strong>${params.model} ${params.trim}</strong> (${params.country})
      vient d'atteindre un nouveau prix plancher : <strong>${price}</strong>.</p>
      <p>C'est le moment de vérifier la configuration sur tesla.com.</p>
    `,
  });
}
