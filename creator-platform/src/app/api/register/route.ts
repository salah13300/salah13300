import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { submitKycCheck } from "@/lib/kyc";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide." }, { status: 400 });
  }

  const { email, password, role, birthdate } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet email." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Vérification de majorité / KYC — voir src/lib/kyc.ts (MOCK, à remplacer par un vrai prestataire).
  const kyc = await submitKycCheck({
    userId: email, // en mock uniquement : en prod on utiliserait l'ID utilisateur après création
    kind: role === "CREATOR" ? "creator_full_kyc" : "age_verification",
    declaredBirthdate: birthdate,
  });

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      role,
      ageVerified: kyc.status === "APPROVED",
      kycStatus: kyc.status,
      kycProvider: kyc.provider,
      kycReference: kyc.reference,
    },
  });

  return NextResponse.json({
    id: user.id,
    role: user.role,
    kycStatus: user.kycStatus,
    nextStep: role === "CREATOR" ? "/onboarding/creator" : "/onboarding/fan",
  });
}
