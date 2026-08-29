"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export function DashPanel({ country }: { country: string }) {
  const t = useTranslations("home");
  const [lowCount, setLowCount] = useState<number | null>(null);
  const [total, setTotal] = useState(5);
  const [displayCount, setDisplayCount] = useState(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    setLowCount(null);

    fetch(`/api/prices/latest?country=${country}`)
      .then((res) => res.json())
      .then((json) => {
        const models = json.models ?? [];
        setTotal(models.length);
        setLowCount(models.filter((m: any) => m.isAtLow).length);
      })
      .catch(() => setLowCount(0));
  }, [country]);

  // Petite animation de comptage façon compteur de bord — respecte
  // prefers-reduced-motion en sautant directement à la valeur finale.
  useEffect(() => {
    if (lowCount === null) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      setDisplayCount(lowCount);
      return;
    }

    const start = performance.now();
    const duration = 500;

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      setDisplayCount(Math.round(lowCount! * progress));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [lowCount]);

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
        {lowCount === null ? (
          <span className="value skeleton" style={{ width: 64, height: 64 }}>
            0
          </span>
        ) : (
          <span className="value">{displayCount}</span>
        )}
        <span className="unit">{reading}</span>
      </div>

      <div className="dash-panel-footer">
        <span className="live-dot">● {t("dashLive")}</span>
        <span>{t("dashUpdate")}</span>
      </div>
    </div>
  );
}
