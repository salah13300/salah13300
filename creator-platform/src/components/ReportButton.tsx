"use client";

import { useState } from "react";

export default function ReportButton({
  targetType,
  targetId,
}: {
  targetType: "content" | "message" | "creatorProfile";
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);

  async function submit() {
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason }),
    });
    setSent(true);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-white/40 hover:text-red-400">
        🚩 Signaler
      </button>
    );
  }

  if (sent) {
    return <p className="text-xs text-white/50">Signalement envoyé, merci — traitement prioritaire.</p>;
  }

  return (
    <div className="rounded-lg border border-white/10 bg-ink-800 p-3 text-xs">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Décrivez le problème (contenu illégal, arnaque, comportement...)"
        className="mb-2 w-full rounded border border-white/20 bg-ink-900 p-2"
        rows={2}
      />
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={reason.length < 3}
          className="rounded-full bg-red-600 px-3 py-1 font-medium disabled:opacity-50"
        >
          Envoyer
        </button>
        <button onClick={() => setOpen(false)} className="text-white/50">
          Annuler
        </button>
      </div>
    </div>
  );
}
