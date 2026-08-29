import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pricesQuerySchema } from "@/lib/validation";

// GET /api/prices?country=FR&model=model-3
// Renvoie l'historique de prix pour affichage sur le frontend
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = pricesQuerySchema.safeParse({
    country: searchParams.get("country"),
    model: searchParams.get("model"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paramètres 'country' et 'model' requis et valides" },
      { status: 400 }
    );
  }

  const { country, model } = parsed.data;

  const history = await prisma.priceSnapshot.findMany({
    where: { country, model },
    orderBy: { recordedAt: "asc" },
  });

  return NextResponse.json({ history });
}
