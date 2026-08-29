import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchDailyNews } from "@/lib/news";

// Appelée une fois par jour par le cron Vercel (voir vercel.json)
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const entries = await fetchDailyNews();
  let added = 0;

  for (const entry of entries) {
    try {
      await prisma.newsItem.create({ data: entry });
      added++;
    } catch (err: any) {
      if (err?.code !== "P2002") console.error("Erreur article:", err);
    }
  }

  return NextResponse.json({ added, fetched: entries.length });
}
