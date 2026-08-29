"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function DashPanel({ country }: { country: string }) {
  const t = useTranslations("home");
  const [lowCount, setLowCount] = useState<number | null>(null);
  const [total, setTotal] = useState(5);

  useEffect(() => {
    fetch(`/api/prices/latest?country=${country}`)
      .then((res) => res.json())
      .then((json) => {
        const models = json.models ?? [];
        setTotal(models.length);
        setLowCount(models.filter((m: any) => m.isAtLow).length);
      });
  }, [country]);

  const reading = t("dashReading", {
    plural: lowCount === 1 ? "" : "s",
    total,
  });

  return (
    <div className="dash-panel">
      <span className="dash-panel-label">
        {t("dashLabel")} · {country}
      </span>

      <div className="dash-panel-reading">
        <span className="value">{lowCount ?? "–"}</span>
        <span className="unit">{reading}</span>
      </div>

      <div className="dash-panel-footer">
        <span className="live-dot">● {t("dashLive")}</span>
        <span>{t("dashUpdate")}</span>
      </div>
    </div>
  );
}
