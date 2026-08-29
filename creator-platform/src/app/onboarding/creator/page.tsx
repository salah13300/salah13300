"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatorOnboardingPage() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState(999);
  const [iban, setIban] = useState("");
  const [contractAccepted, setContractAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/creator-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle,
        displayName,
        bio,
        subscriptionPriceCents: Math.round(price * 100),
        iban,
        contractAccepted,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Erreur.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="mb-3 text-2xl font-bold">Profil soumis ✅</h1>
        <p className="text-white/70">
          Votre profil est en attente de validation par notre équipe de modération (vérification
          KYC + conformité du contenu, section 4.4 du cahier des charges). Vous recevrez une
          notification dès qu&apos;il sera approuvé et visible publiquement.
        </p>
        <button
          onClick={() => router.push("/dashboard/creator")}
          className="mt-6 rounded-full bg-brand-600 px-6 py-2 font-medium hover:bg-brand-500"
        >
          Aller à mon studio
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold">Configurer votre profil créateur</h1>
      <p className="mb-6 text-sm text-white/60">
        Votre identité a été soumise à notre prestataire de vérification (KYC — mock en
        environnement de démo). Renseignez maintenant votre profil public.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-white/70">Nom d&apos;utilisateur (URL publique)</label>
          <input
            required
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
            placeholder="ex: luna_star"
            className="w-full rounded-lg border border-white/20 bg-ink-800 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/70">Nom affiché</label>
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-ink-800 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/70">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-white/20 bg-ink-800 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/70">Prix d&apos;abonnement mensuel (€)</label>
          <input
            type="number"
            min={1.99}
            step={0.5}
            required
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full rounded-lg border border-white/20 bg-ink-800 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/70">IBAN (pour les reversements)</label>
          <input
            required
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="FR76..."
            className="w-full rounded-lg border border-white/20 bg-ink-800 px-3 py-2"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={contractAccepted}
            onChange={(e) => setContractAccepted(e.target.checked)}
            className="mt-1"
          />
          Je certifie être l&apos;unique titulaire des droits sur le contenu déposé, consens à sa
          publication et signe électroniquement le contrat créateur.
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-full bg-brand-600 py-2 font-medium hover:bg-brand-500 disabled:opacity-50"
        >
          {loading ? "Envoi..." : "Soumettre pour validation"}
        </button>
      </form>
    </div>
  );
}
