"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface PricePoint {
  recordedAt: string;
  priceCents: number;
  trim: string;
}

export function PriceHistoryChart({
  country,
  model,
}: {
  country: string;
  model: string;
}) {
  const t = useTranslations("chart");
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/prices?country=${country}&model=${model}`)
      .then((res) => res.json())
      .then((json) => setData(json.history ?? []))
      .finally(() => setLoading(false));
  }, [country, model]);

  if (loading) return <p className="chart-empty">{t("loading")}</p>;
  if (data.length === 0) return <p className="chart-empty">{t("empty")}</p>;

  const chartData = data.map((d) => ({
    date: new Date(d.recordedAt).toLocaleDateString("fr-FR"),
    prix: d.priceCents / 100,
    trim: d.trim,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="#2A2F35" strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#8B929A" }}
          axisLine={{ stroke: "#2A2F35" }}
          tickLine={false}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#8B929A" }}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <Tooltip
          contentStyle={{
            fontFamily: "JetBrains Mono",
            fontSize: 12,
            background: "#1C2025",
            border: "1px solid #2A2F35",
            borderRadius: 10,
            color: "#F2F4F6",
          }}
          formatter={(value: number) => `${value.toLocaleString("fr-FR")} €`}
        />
        <Line type="stepAfter" dataKey="prix" stroke="#3FA9F5" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
