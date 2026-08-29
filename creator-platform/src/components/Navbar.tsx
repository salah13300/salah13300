"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-white/10 bg-ink-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Velvet<span className="text-brand-500">Club</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/creators" className="text-white/70 hover:text-white">
            Découvrir
          </Link>
          {!session && (
            <>
              <Link href="/register?role=CREATOR" className="text-white/70 hover:text-white">
                Devenir créateur·rice
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-white/20 px-4 py-1.5 hover:bg-white/5"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-brand-600 px-4 py-1.5 font-medium hover:bg-brand-500"
              >
                S&apos;inscrire
              </Link>
            </>
          )}
          {session?.user.role === "FAN" && (
            <Link href="/dashboard/fan" className="rounded-full border border-white/20 px-4 py-1.5 hover:bg-white/5">
              Mon espace
            </Link>
          )}
          {session?.user.role === "CREATOR" && (
            <Link
              href="/dashboard/creator"
              className="rounded-full border border-white/20 px-4 py-1.5 hover:bg-white/5"
            >
              Mon studio
            </Link>
          )}
          {(session?.user.role === "MODERATOR" || session?.user.role === "ADMIN") && (
            <Link href="/admin/moderation" className="rounded-full border border-white/20 px-4 py-1.5 hover:bg-white/5">
              Modération
            </Link>
          )}
          {session && (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-white/50 hover:text-white"
            >
              Déconnexion
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
