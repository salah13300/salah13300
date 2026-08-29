import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(email: string, role: "FAN" | "CREATOR" | "MODERATOR" | "ADMIN") {
  const passwordHash = await bcrypt.hash("password1234", 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      role,
      ageVerified: true,
      kycStatus: "APPROVED",
      kycProvider: "mock-kyc-provider",
      walletBalanceCents: role === "FAN" ? 10000 : 0,
    },
  });
}

async function main() {
  const admin = await upsertUser("admin@demo.local", "ADMIN");
  const fan = await upsertUser("fan@demo.local", "FAN");
  const creatorUser = await upsertUser("luna@demo.local", "CREATOR");

  const creator = await prisma.creatorProfile.upsert({
    where: { userId: creatorUser.id },
    update: {},
    create: {
      userId: creatorUser.id,
      handle: "luna_star",
      displayName: "Luna Star",
      bio: "Créatrice lifestyle & fitness. Contenu exclusif chaque semaine ✨",
      subscriptionPriceCents: 999,
      status: "APPROVED",
      contractSignedAt: new Date(),
    },
  });

  const existingContent = await prisma.content.count({ where: { creatorId: creator.id } });
  if (existingContent === 0) {
    await prisma.content.createMany({
      data: [
        {
          creatorId: creator.id,
          title: "Teaser gratuit",
          mediaUrl: "https://picsum.photos/seed/teaser/600/800",
          thumbnailUrl: "https://picsum.photos/seed/teaser/600/800",
          visibility: "PUBLIC_TEASER",
        },
        {
          creatorId: creator.id,
          title: "Contenu abonnés",
          mediaUrl: "https://picsum.photos/seed/subs/600/800",
          thumbnailUrl: "https://picsum.photos/seed/subs/600/800",
          visibility: "SUBSCRIBERS",
        },
        {
          creatorId: creator.id,
          title: "Contenu exclusif PPV",
          mediaUrl: "https://picsum.photos/seed/ppv/600/800",
          thumbnailUrl: "https://picsum.photos/seed/ppv/600/800",
          visibility: "PAY_PER_VIEW",
          priceCents: 500,
        },
      ],
    });
  }

  console.log("Seed terminé.");
  console.log("Comptes de démo (mot de passe: password1234) :");
  console.log(` - Admin/Modérateur : ${admin.email}`);
  console.log(` - Fan (solde 100€) : ${fan.email}`);
  console.log(` - Créateur approuvé : ${creatorUser.email} (@${creator.handle})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
