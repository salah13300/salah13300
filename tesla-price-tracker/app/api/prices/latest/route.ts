import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MODELS } from "@/lib/countries";

// GET /api/prices/latest?country=FR
// Renvoie, pour chaque modèle, le dernier prix enregistré (ou null si aucun
// relevé n'existe encore) — alimente la bande "ledger" de la page d'accueil.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") ?? "FR";

  const results = await Promise.all(
    MODELS.map(async (model) => {
      const latest = await prisma.priceSnapshot.findFirst({
        where: { country, model: model.slug },
        orderBy: { recordedAt: "desc" },
      });

      if (!latest) {
        return { model: model.slug, name: model.name, price: null };
      }

      const min = await prisma.priceSnapshot.aggregate({
        where: { country, model: model.slug },
        _min: { priceCents: true },
      });

      return {
        model: model.slug,
        name: model.name,
        price: latest.priceCents,
        currency: latest.currency,
        isAtLow: latest.priceCents === min._min.priceCents,
      };
    })
  );

  return NextResponse.json({ country, models: results });
}
