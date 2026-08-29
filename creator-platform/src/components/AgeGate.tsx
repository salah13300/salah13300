"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "age-gate-ack-v1";

/**
 * Interstitiel d'avertissement 18+ affiché à toute visite.
 * Ce n'est PAS une vérification de majorité (celle-ci est faite via KYC à l'inscription,
 * voir src/lib/kyc.ts) — c'est un avertissement légal d'accès, comme l'exige la section 3.1.
 */
export default function AgeGate() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const ack = window.localStorage.getItem(STORAGE_KEY);
    if (!ack) setVisible(true);
  }, []);

  if (!visible) return null;

  function acknowledge() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function leave() {
    window.location.href = "https://www.google.com";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="max-w-md rounded-2xl border border-white/10 bg-ink-800 p-8 text-center shadow-xl">
        <p className="mb-2 text-3xl font-bold text-brand-500">18+</p>
        <h2 className="mb-3 text-lg font-semibold">Contenu réservé aux adultes</h2>
        <p className="mb-6 text-sm text-white/70">
          Ce site présente des créateurs et créatrices de contenu premium. L&apos;accès aux
          contenus est réservé aux personnes majeures, après vérification d&apos;identité lors
          de l&apos;inscription. En continuant, vous confirmez avoir au moins 18 ans.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            onClick={acknowledge}
            className="rounded-full bg-brand-600 px-6 py-2 font-medium hover:bg-brand-500"
          >
            J&apos;ai 18 ans ou plus — Continuer
          </button>
          <button
            onClick={leave}
            className="rounded-full border border-white/20 px-6 py-2 font-medium text-white/70 hover:bg-white/5"
          >
            Quitter
          </button>
        </div>
      </div>
    </div>
  );
}
