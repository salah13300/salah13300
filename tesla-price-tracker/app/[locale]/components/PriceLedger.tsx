"use client";

import { useEffect, useState } from "react";

interface LedgerEntry {
  model: string;
  name: string;
  price: number | null;
  currency?: string;
  isAtLow?: boolean;
}

export function PriceLedger({ country }: { country: string }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    fetch(`/api/prices/latest?country=${country}`)
      .then((res) => res.json())
      .then((json) => setEntries(json.models ?? []));
  }, [country]);

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
                : "en attente"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
