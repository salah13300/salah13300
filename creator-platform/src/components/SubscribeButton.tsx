"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SubscribeButton({
  creatorId,
  priceCents,
  isAuthenticated,
}: {
  creatorId: string;
  priceCents: number;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    if (!isAuthenticated) {
      router.push("/register");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button
        onClick={subscribe}
        disabled={loading}
        className="rounded-full bg-brand-600 px-6 py-2 font-semibold hover:bg-brand-500 disabled:opacity-50"
      >
        {loading ? "..." : `S'abonner — ${(priceCents / 100).toFixed(2)}€/mois`}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
