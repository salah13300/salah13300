"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ContentUploadForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC_TEASER" | "SUBSCRIBERS" | "PAY_PER_VIEW">(
    "SUBSCRIBERS"
  );
  const [price, setPrice] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        mediaUrl,
        visibility,
        priceCents: visibility === "PAY_PER_VIEW" ? Math.round(price * 100) : 0,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Erreur.");
      return;
    }
    setTitle("");
    setMediaUrl("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-white/10 bg-ink-800 p-4">
      <h3 className="font-semibold">Publier un contenu</h3>
      <input
        required
        placeholder="Titre"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-lg border border-white/20 bg-ink-900 px-3 py-2 text-sm"
      />
      <input
        required
        placeholder="URL de l'image/vidéo (démo — en prod: upload direct vers S3/CDN signé)"
        value={mediaUrl}
        onChange={(e) => setMediaUrl(e.target.value)}
        className="w-full rounded-lg border border-white/20 bg-ink-900 px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as typeof visibility)}
          className="rounded-lg border border-white/20 bg-ink-900 px-3 py-2 text-sm"
        >
          <option value="PUBLIC_TEASER">Teaser public (SFW)</option>
          <option value="SUBSCRIBERS">Réservé abonnés</option>
          <option value="PAY_PER_VIEW">Payant à l&apos;unité</option>
        </select>
        {visibility === "PAY_PER_VIEW" && (
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-24 rounded-lg border border-white/20 bg-ink-900 px-3 py-2 text-sm"
          />
        )}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        disabled={loading}
        className="rounded-full bg-brand-600 px-5 py-2 text-sm font-medium hover:bg-brand-500 disabled:opacity-50"
      >
        {loading ? "Publication..." : "Publier"}
      </button>
    </form>
  );
}
