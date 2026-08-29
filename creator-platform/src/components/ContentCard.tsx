"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ContentCard({
  id,
  title,
  mediaUrl,
  thumbnailUrl,
  visibility,
  priceCents,
  isSubscribed,
  isUnlocked,
  isAuthenticated,
}: {
  id: string;
  title: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  visibility: string;
  priceCents: number;
  isSubscribed: boolean;
  isUnlocked: boolean;
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [error, setError] = useState<string | null>(null);

  const accessible =
    visibility === "PUBLIC_TEASER" || (visibility === "SUBSCRIBERS" && isSubscribed) || unlocked;

  async function unlock() {
    if (!isAuthenticated) {
      router.push("/register");
      return;
    }
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/content/${id}/unlock`, { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur.");
      return;
    }
    setUnlocked(true);
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-ink-800">
      <div className="relative aspect-square w-full bg-ink-700">
        <img
          src={thumbnailUrl ?? mediaUrl}
          alt=""
          className={`h-full w-full object-cover ${accessible ? "" : "teaser-blur"}`}
        />
        {!accessible && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 p-3 text-center">
            <span className="text-2xl">🔒</span>
            <p className="text-xs text-white/70">
              {visibility === "SUBSCRIBERS" ? "Réservé aux abonnés" : `Débloquer — ${(priceCents / 100).toFixed(2)}€`}
            </p>
            {visibility === "PAY_PER_VIEW" && (
              <button
                onClick={unlock}
                disabled={loading}
                className="rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold hover:bg-brand-500 disabled:opacity-50"
              >
                {loading ? "..." : "Débloquer"}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium">{title}</p>
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
      </div>
    </div>
  );
}
