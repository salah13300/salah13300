"use client";

import { useState } from "react";

const AMOUNTS = [200, 500, 1000];

export default function TipButton({ creatorId }: { creatorId: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function tip(amountCents: number) {
    setError(null);
    const res = await fetch("/api/tip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId, amountCents }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erreur.");
      return;
    }
    setSent(true);
  }

  if (sent) return <p className="text-sm text-green-400">Merci pour votre pourboire 💝</p>;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-brand-400 hover:underline">
        💝 Envoyer un pourboire
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => tip(a)}
            className="rounded-full border border-white/20 px-3 py-1 text-sm hover:border-brand-500"
          >
            {(a / 100).toFixed(0)}€
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
