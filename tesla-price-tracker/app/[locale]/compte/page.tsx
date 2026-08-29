"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "../components/SiteHeader";

interface NewsItem {
  id: string;
  title: string;
  url: string;
  summary?: string;
  source: string;
  publishedAt: string;
}

type AuthState = "checking" | "logged-out" | "link-sent" | "logged-in";

export default function AccountPage() {
  const t = useTranslations("account");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [authState, setAuthState] = useState<AuthState>("checking");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [news, setNews] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Au chargement : vérifie si une session valide existe déjà (cookie).
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((json) => {
        if (json.authenticated) {
          setSessionEmail(json.email);
          setAuthState("logged-in");
        } else {
          setAuthState("logged-out");
          if (searchParams.get("authError")) {
            setError(t("linkExpired"));
          }
        }
      })
      .catch(() => setAuthState("logged-out"));
  }, [searchParams, t]);

  // Une fois connecté, charge automatiquement les actus du jour.
  useEffect(() => {
    if (authState !== "logged-in") return;

    fetch("/api/news")
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 402 ? "sub" : "generic");
        return res.json();
      })
      .then((json) => setNews(json.news))
      .catch((err) => {
        setError(err.message === "sub" ? t("errorSubRequired") : t("errorGeneric"));
      });
  }, [authState, t]);

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/auth/request-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, locale }),
    });

    if (res.ok) {
      setAuthState("link-sent");
    } else {
      setError(t("errorGeneric"));
    }
  }

  async function openBillingPortal() {
    setError(null);
    const res = await fetch("/api/portal", { method: "POST" });
    const json = await res.json();
    if (json.url) window.location.href = json.url;
    else setError(json.error ?? t("errorGeneric"));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSessionEmail(null);
    setNews(null);
    setAuthState("logged-out");
  }

  return (
    <>
      <SiteHeader />
      <main className="shell">
        <p className="eyebrow">{t("eyebrow")}</p>
        <h1 className="hero-title">{t("title")}</h1>
        <p className="hero-sub">{t("subtitle")}</p>

        <div className="card">
          {authState === "checking" && <p className="status-msg">{t("loading")}</p>}

          {authState === "logged-out" && (
            <form onSubmit={requestLink}>
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
              <button type="submit" className="btn btn-primary">
                {t("requestLink")}
              </button>
            </form>
          )}

          {authState === "link-sent" && <p className="status-msg">{t("linkSent")}</p>}

          {authState === "logged-in" && (
            <>
              <p className="status-msg">{t("loggedInAs", { email: sessionEmail ?? "" })}</p>
              <button
                type="button"
                onClick={openBillingPortal}
                className="btn btn-secondary"
                style={{ marginTop: 12, marginBottom: 12 }}
              >
                {t("manageSubscription")}
              </button>
              <button type="button" onClick={logout} className="btn btn-secondary">
                {t("logout")}
              </button>
            </>
          )}

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
