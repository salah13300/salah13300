"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESETS = [1000, 2500, 5000];

export default function FanOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  async function topUp(amountCents: number) {
    setLoading(true);
    const res = await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setBalance(data.walletBalanceCents);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="mb-2 text-2xl font-bold">Bienvenue !</h1>
      <p className="mb-8 text-sm text-white/60">
        Votre majorité a été vérifiée (KYC — simulé en environnement de démo). Ajoutez du solde à
        votre portefeuille pour vous abonner et débloquer du contenu. Aucune carte réelle n&apos;est
        demandée dans cette démonstration.
      </p>

      {balance !== null ? (
        <div className="rounded-xl border border-brand-500/30 bg-brand-500/10 p-6">
          <p className="text-sm text-white/60">Nouveau solde</p>
          <p className="text-3xl font-bold">{(balance / 100).toFixed(2)}€</p>
          <button
            onClick={() => router.push("/creators")}
            className="mt-6 rounded-full bg-brand-600 px-6 py-2 font-medium hover:bg-brand-500"
          >
            Découvrir les créateurs
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {PRESETS.map((amount) => (
            <button
              key={amount}
              disabled={loading}
              onClick={() => topUp(amount)}
              className="rounded-xl border border-white/20 bg-ink-800 py-4 font-semibold hover:border-brand-500 disabled:opacity-50"
            >
              {(amount / 100).toFixed(0)}€
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => router.push("/creators")}
        className="mt-8 block w-full text-sm text-white/40 hover:text-white/70"
      >
        Passer cette étape
      </button>
    </div>
  );
}
