"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { SiteHeader } from "../components/SiteHeader";

interface NewsItem {
  id: string;
  title: string;
  url: string;
  summary?: string;
  source: string;
  publishedAt: string;
}

export default function AccountPage() {
  const t = useTranslations("account");
  const [email, setEmail] = useState("");
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadNews(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNews(null);

    const res = await fetch(`/api/news?email=${encodeURIComponent(email)}`);
    const json = await res.json();

    if (!res.ok) {
      setError(res.status === 402 ? t("errorSubRequired") : json.error ?? t("errorGeneric"));
      return;
    }

    setNews(json.news);
  }

  async function openBillingPortal() {
    const res = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (json.url) window.location.href = json.url;
    else setError(json.error ?? t("errorGeneric"));
  }

  return (
    <>
      <SiteHeader />
      <main className="shell">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="hero-title">{t("title")}</h1>
        <p className="hero-sub">{t("subtitle")}</p>

        <div className="card">
          <form onSubmit={loadNews}>
            <div className="field">
              <label htmlFor="account-email">{t("emailLabel")}</label>
              <input
                id="account-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@example.com"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginBottom: 12 }}>
              {t("viewNews")}
            </button>
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={!email}
              className="btn btn-secondary"
            >
              {t("manageSubscription")}
            </button>
          </form>
          {error && <p className="status-msg is-error">{error}</p>}
        </div>

        {news && (
          <section className="section">
            <p className="section-label">{t("newsSection")}</p>
            <h2>{t("newsTitle")}</h2>
            <ul className="news-list">
              {news.map((item) => (
                <li key={item.id} className="news-item">
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {item.title}
                  </a>
                  <div className="news-meta">
                    {item.source} · {new Date(item.publishedAt).toLocaleDateString()}
                  </div>
                  {item.summary && <p className="news-summary">{item.summary}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
