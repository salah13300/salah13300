"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { COUNTRIES, MODELS } from "@/lib/countries";
import { PriceHistoryChart } from "./components/PriceHistoryChart";
import { PriceLedger } from "./components/PriceLedger";
import { SiteHeader } from "./components/SiteHeader";
import { NewsTeaser } from "./components/NewsTeaser";
import { DashPanel } from "./components/DashPanel";

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Tesla Price Tracker — abonnement",
  description:
    "Alertes email sur les baisses de prix Tesla et fil d'actus Tesla quotidien.",
  offers: {
    "@type": "Offer",
    price: "3.99",
    priceCurrency: "EUR",
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: "3.99",
      priceCurrency: "EUR",
      billingDuration: "P1M",
    },
  },
};

export default function HomePage() {
  const t = useTranslations("home");
  const locale = useLocale();
  const [country, setCountry] = useState<string>(COUNTRIES[0].code);
  const [model, setModel] = useState<string>(MODELS[0].slug);
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [alertEmail, setAlertEmail] = useState("");
  const [alertStatus, setAlertStatus] = useState<{ text: string; error?: boolean } | null>(null);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setCheckoutStatus(t("checkoutRedirect"));

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: checkoutEmail }),
    });
    const json = await res.json();

    if (json.url) window.location.href = json.url;
    else setCheckoutStatus(t("checkoutError"));
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setAlertStatus({ text: t("alertSending") });

    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: alertEmail, country, model }),
    });
    const json = await res.json();

    setAlertStatus(
      res.ok
        ? { text: t("alertSuccess") }
        : { text: json.error ?? t("checkoutError"), error: true }
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <SiteHeader />
      <main className="shell">
        <div className="hero-grid">
          <div>
            <p className="eyebrow">{t("eyebrow")}</p>
            <h1 className="hero-title">
              {t("title1")}
              <br />
              {t("title2")}
            </h1>
            <p className="hero-sub">{t("subtitle")}</p>
            <div className="hero-stats">
              <div>
                <div className="hero-stat-value">{MODELS.length}</div>
                <div className="hero-stat-label">{t("statModels")}</div>
              </div>
              <div>
                <div className="hero-stat-value">{COUNTRIES.length}</div>
                <div className="hero-stat-label">{t("statCountries")}</div>
              </div>
              <div>
                <div className="hero-stat-value">3,99€</div>
                <div className="hero-stat-label">{t("statPrice")}</div>
              </div>
            </div>
          </div>

          <DashPanel country={country} />
        </div>

        <PriceLedger country={country} />

        <NewsTeaser />

        <section className="section">
          <p className="section-label">{t("actionSection")}</p>
          <h2>{t("actionTitle")}</h2>
          <div className="split-grid">
            <div className="pricing-card">
              <div className="pricing-total">
                <span className="amount">3,99&nbsp;€</span>
                <span className="period">{t("pricePerMonth")}</span>
              </div>
              <div className="pricing-row">
                <span>{t("featureAlerts")}</span>
                <span>{t("featureAlertsValue")}</span>
              </div>
              <div className="pricing-row">
                <span>{t("featureCoverage")}</span>
                <span>{t("featureCoverageValue")}</span>
              </div>
              <div className="pricing-row">
                <span>{t("featureNews")}</span>
                <span>{t("featureNewsValue")}</span>
              </div>
              <form onSubmit={handleCheckout} style={{ marginTop: 24, position: "relative" }}>
                <div className="field">
                  <label htmlFor="checkout-email">{t("emailLabel")}</label>
                  <input
                    id="checkout-email"
                    type="email"
                    required
                    value={checkoutEmail}
                    onChange={(e) => setCheckoutEmail(e.target.value)}
                    placeholder="toi@example.com"
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  {t("startSubscription")}
                </button>
                {checkoutStatus && <p className="status-msg">{checkoutStatus}</p>}
              </form>
            </div>

            <div className="card">
              <p className="section-label" style={{ marginBottom: 20 }}>
                {t("orJustAlert")}
              </p>
              <form onSubmit={handleSubscribe}>
                <div className="field">
                  <label htmlFor="alert-country">{t("countryLabel")}</label>
                  <select
                    id="alert-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="alert-model">{t("modelLabel")}</label>
                  <select
                    id="alert-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  >
                    {MODELS.map((m) => (
                      <option key={m.slug} value={m.slug}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="alert-email">{t("emailLabel")}</label>
                  <input
                    id="alert-email"
                    type="email"
                    required
                    value={alertEmail}
                    onChange={(e) => setAlertEmail(e.target.value)}
                    placeholder="toi@example.com"
                  />
                </div>

                <button type="submit" className="btn btn-secondary">
                  {t("activateAlert")}
                </button>
                {alertStatus && (
                  <p className={`status-msg ${alertStatus.error ? "is-error" : ""}`}>
                    {alertStatus.text}
                  </p>
                )}
              </form>
            </div>
          </div>
        </section>

        <section className="section">
          <p className="section-label">{t("historySection")}</p>
          <h2>
            {MODELS.find((m) => m.slug === model)?.name} ·{" "}
            {COUNTRIES.find((c) => c.code === country)?.name}
          </h2>
          <div className="card">
            <PriceHistoryChart country={country} model={model} />
          </div>
        </section>

        <a className="footer-link" href={`/${locale}/compte`}>
          {t("footerLink")}
        </a>
      </main>
    </>
  );
}
