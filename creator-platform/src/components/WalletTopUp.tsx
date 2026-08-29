"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const PRESETS = [1000, 2500, 5000];

export default function WalletTopUp() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function topUp(amountCents: number) {
    setLoading(true);
    await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {PRESETS.map((amount) => (
        <button
          key={amount}
          disabled={loading}
          onClick={() => topUp(amount)}
          className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium hover:border-brand-500 disabled:opacity-50"
        >
          + {(amount / 100).toFixed(0)}€
        </button>
      ))}
    </div>
  );
}
