import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Échappe les valeurs interpolées dans les templates HTML des emails.
// "model"/"trim" viennent du scraper Tesla (pas d'un utilisateur direct),
// mais autant ne jamais injecter du texte non échappé dans du HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
  const model = escapeHtml(params.model);
  const trim = escapeHtml(params.trim);
  const country = escapeHtml(params.country);

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
      <p>Le <strong>${model} ${trim}</strong> (${country})
      vient d'atteindre un nouveau prix plancher : <strong>${price}</strong>.</p>
      <p>C'est le moment de vérifier la configuration sur tesla.com.</p>
    `,
  });
}

export async function sendMagicLinkEmail(params: { to: string; url: string }) {
  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: params.to,
    subject: "Ton lien de connexion — Tesla Price Tracker",
    html: `
      <p>Clique sur le lien ci-dessous pour accéder à ton compte (valable 15 minutes) :</p>
      <p><a href="${params.url}">${params.url}</a></p>
      <p>Si tu n'es pas à l'origine de cette demande, ignore simplement cet email.</p>
    `,
  });
}
