import Parser from "rss-parser";

const parser = new Parser();

// Flux RSS publics — à ajuster/compléter selon ce que tu veux couvrir.
// Toutes ces sources publient un flux RSS standard, pas besoin de scraping HTML.
const FEEDS = [
  { url: "https://www.teslarati.com/feed/", source: "Teslarati" },
  { url: "https://electrek.co/guides/tesla/feed/", source: "Electrek" },
  { url: "https://www.teslaoracle.com/feed/", source: "Tesla Oracle" },
];

export interface NewsEntry {
  title: string;
  url: string;
  summary?: string;
  source: string;
  publishedAt: Date;
}

export async function fetchDailyNews(): Promise<NewsEntry[]> {
  const entries: NewsEntry[] = [];

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);

      for (const item of parsed.items) {
        if (!item.link || !item.title) continue;

        entries.push({
          title: item.title,
          url: item.link,
          summary: item.contentSnippet?.slice(0, 300),
          source: feed.source,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        });
      }
    } catch (err) {
      console.error(`Échec de récupération du flux ${feed.source}:`, err);
      // On continue avec les autres flux même si un échoue
    }
  }

  return entries;
}
