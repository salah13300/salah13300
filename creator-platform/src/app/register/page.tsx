"use client";

import { FormEvent, Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialRole = params.get("role") === "CREATOR" ? "CREATOR" : "FAN";

  const [role, setRole] = useState<"FAN" | "CREATOR">(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role, birthdate, acceptedTerms }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Une erreur est survenue.");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      router.push("/login");
      return;
    }
    router.push(data.nextStep);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-2 text-2xl font-bold">Créer un compte</h1>
      <p className="mb-6 text-sm text-white/60">
        Site réservé aux personnes majeures. Une vérification d&apos;identité vous sera
        demandée à l&apos;étape suivante.
      </p>

      <div className="mb-6 flex rounded-full border border-white/20 p-1 text-sm">
        <button
          type="button"
          onClick={() => setRole("FAN")}
          className={`flex-1 rounded-full py-2 ${role === "FAN" ? "bg-brand-600" : ""}`}
        >
          Je suis fan
        </button>
        <button
          type="button"
          onClick={() => setRole("CREATOR")}
          className={`flex-1 rounded-full py-2 ${role === "CREATOR" ? "bg-brand-600" : ""}`}
        >
          Je suis créateur·rice
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-white/70">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-ink-800 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/70">Mot de passe (10 caractères min.)</label>
          <input
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-ink-800 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/70">Date de naissance</label>
          <input
            type="date"
            required
            value={birthdate}
            onChange={(e) => setBirthdate(e.target.value)}
            className="w-full rounded-lg border border-white/20 bg-ink-800 px-3 py-2"
          />
          <p className="mt-1 text-xs text-white/40">
            Une vérification d&apos;identité (KYC) confirmera votre majorité — obligatoire avant tout accès au contenu.
          </p>
        </div>
        <label className="flex items-start gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-1"
          />
          J&apos;accepte les CGU/CGV et confirme être majeur·e.
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-full bg-brand-600 py-2 font-medium hover:bg-brand-500 disabled:opacity-50"
        >
          {loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
