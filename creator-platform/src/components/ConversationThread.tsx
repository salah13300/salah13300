"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface MessageDTO {
  id: string;
  senderId: string;
  body: string;
  mediaUrl: string | null;
  priceCents: number;
  unlocked: boolean;
  createdAt: string;
}

export default function ConversationThread({
  conversationId,
  messages,
  currentUserId,
  canSendMedia,
}: {
  conversationId: string;
  messages: MessageDTO[];
  currentUserId: string;
  canSendMedia: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [priceCents, setPriceCents] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body,
        mediaUrl: mediaUrl || undefined,
        priceCents: canSendMedia ? priceCents : 0,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Erreur.");
      return;
    }
    setBody("");
    setMediaUrl("");
    setPriceCents(0);
    router.refresh();
  }

  async function unlock(messageId: string) {
    const res = await fetch(`/api/messages/${messageId}/unlock`, { method: "POST" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          const locked = m.priceCents > 0 && !m.unlocked && !mine;
          return (
            <div key={m.id} className={`max-w-md rounded-2xl px-4 py-2 ${mine ? "self-end bg-brand-600" : "self-start bg-ink-800"}`}>
              {m.body && <p className="text-sm">{m.body}</p>}
              {m.mediaUrl && (
                <div className="mt-2">
                  {locked ? (
                    <div className="flex flex-col items-start gap-2">
                      <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-black/40 text-2xl">🔒</div>
                      <button
                        onClick={() => unlock(m.id)}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium hover:bg-white/20"
                      >
                        Débloquer — {(m.priceCents / 100).toFixed(2)}€
                      </button>
                    </div>
                  ) : (
                    <img src={m.mediaUrl} alt="" className="max-h-64 rounded-lg" />
                  )}
                </div>
              )}
            </div>
          );
        })}
        {messages.length === 0 && <p className="text-sm text-white/40">Aucun message pour le moment.</p>}
      </div>

      <form onSubmit={send} className="space-y-2 rounded-xl border border-white/10 bg-ink-800 p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Votre message..."
          rows={2}
          className="w-full rounded-lg border border-white/20 bg-ink-900 px-3 py-2 text-sm"
        />
        {canSendMedia && (
          <div className="flex flex-wrap gap-2">
            <input
              placeholder="URL média (optionnel, PPV)"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              className="flex-1 rounded-lg border border-white/20 bg-ink-900 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              step={0.5}
              value={priceCents / 100}
              onChange={(e) => setPriceCents(Math.round(Number(e.target.value) * 100))}
              placeholder="Prix €"
              className="w-24 rounded-lg border border-white/20 bg-ink-900 px-3 py-2 text-sm"
            />
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="rounded-full bg-brand-600 px-5 py-2 text-sm font-medium hover:bg-brand-500 disabled:opacity-50"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
