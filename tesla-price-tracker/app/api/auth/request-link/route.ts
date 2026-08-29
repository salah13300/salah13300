import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createMagicLinkToken } from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/notify";
import { emailSchema } from "@/lib/validation";
import { locales, defaultLocale } from "@/i18n/config";

const requestLinkSchema = z.object({
  email: emailSchema,
  locale: z.enum(locales).optional(),
});

// POST /api/auth/request-link
// body: { email, locale? }
// Envoie un email avec un lien de connexion si un compte existe pour cet
// email. Répond toujours "ok" (même si le compte n'existe pas) pour éviter
// qu'on puisse déduire quels emails sont enregistrés (énumération de comptes).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestLinkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  const { email } = parsed.data;
  const locale = parsed.data.locale ?? defaultLocale;

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = createMagicLinkToken(email);
    const url = `${process.env.APP_URL}/api/auth/callback?token=${encodeURIComponent(
      token
    )}&locale=${locale}`;
    await sendMagicLinkEmail({ to: email, url });
  }

  return NextResponse.json({ ok: true });
}
