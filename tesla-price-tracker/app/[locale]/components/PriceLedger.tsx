"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MODELS } from "@/lib/countries";

interface LedgerEntry {
  model: string;
  name: string;
  price: number | null;
  currency?: string;
  isAtLow?: boolean;
}

export function PriceLedger({ country }: { country: string }) {
  const t = useTranslations("home");
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/prices/latest?country=${country}`)
      .then((res) => res.json())
      .then((json) => setEntries(json.models ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [country]);

  if (loading) {
    return (
      <div className="ledger">
        {MODELS.map((model) => (
          <div className="ledger-cell" key={model.slug}>
            <div className="ledger-model">{model.name}</div>
            <div className="ledger-price-row">
              <span className="signal-dot neutral" />
              <span className="ledger-price skeleton" style={{ width: 72, height: 19 }}>
                &nbsp;
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="ledger">
      {entries.map((entry) => (
        <div className="ledger-cell" key={entry.model}>
          <div className="ledger-model">{entry.name}</div>
          <div className="ledger-price-row">
            <span
              className={`signal-dot ${
                entry.price === null
                  ? "neutral"
                  : entry.isAtLow
                  ? "low"
                  : "high"
              }`}
            />
            <span className={`ledger-price ${entry.price === null ? "is-empty" : ""}`}>
              {entry.price !== null
                ? (entry.price / 100).toLocaleString("fr-FR", {
                    style: "currency",
                    currency: entry.currency ?? "EUR",
                    maximumFractionDigits: 0,
                  })
                : t("ledgerPending")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
