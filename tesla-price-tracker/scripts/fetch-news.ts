import { prisma } from "../lib/db";
import { fetchDailyNews } from "../lib/news";

async function main() {
  const entries = await fetchDailyNews();
  let added = 0;

  for (const entry of entries) {
    try {
      // `url` est unique en base : on ignore silencieusement les doublons
      // déjà présents (article déjà récupéré lors d'un run précédent)
      await prisma.newsItem.create({ data: entry });
      added++;
    } catch (err: any) {
      if (err?.code !== "P2002") {
        // P2002 = violation de contrainte unique (doublon) → attendu, on ignore
        console.error("Erreur en enregistrant un article:", err);
      }
    }
  }

  console.log(`${added} nouvel(le)s article(s) ajouté(s) sur ${entries.length} récupéré(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
