"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface NewsItem {
  id: string;
  title: string;
  url: string;
  summary?: string;
  source: string;
}

export function NewsTeaser() {
  const t = useTranslations("home");
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    fetch("/api/news/preview")
      .then((res) => res.json())
      .then((json) => setNews(json.news ?? []));
  }, []);

  if (news.length === 0) return null;

  return (
    <section className="section">
      <p className="section-label">{t("freeSection")}</p>
      <h2>{t("freeTitle")}</h2>
      <div className="teaser-grid">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="teaser-card"
          >
            <div className="teaser-source">{item.source}</div>
            <h3 className="teaser-title">{item.title}</h3>
            {item.summary && <p className="teaser-summary">{item.summary}</p>}
          </a>
        ))}
      </div>
      <div className="teaser-cta">
        <p>{t("freeCtaLine1")}</p>
        <p style={{ color: "var(--ink)", fontSize: 14 }}>{t("freeCtaLine2")}</p>
      </div>
    </section>
  );
}
