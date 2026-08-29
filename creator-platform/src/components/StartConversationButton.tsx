"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StartConversationButton({ creatorId }: { creatorId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorId }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) router.push(`/messages/${data.id}`);
  }

  return (
    <button onClick={start} disabled={loading} className="text-sm text-brand-400 hover:underline disabled:opacity-50">
      💬 Envoyer un message
    </button>
  );
}
