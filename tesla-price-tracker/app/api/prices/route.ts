import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/prices?country=FR&model=model-3
// Renvoie l'historique de prix pour affichage sur le frontend
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country");
  const model = searchParams.get("model");

  if (!country || !model) {
    return NextResponse.json(
      { error: "Paramètres 'country' et 'model' requis" },
      { status: 400 }
    );
  }

  const history = await prisma.priceSnapshot.findMany({
    where: { country, model },
    orderBy: { recordedAt: "asc" },
  });

  return NextResponse.json({ history });
}
