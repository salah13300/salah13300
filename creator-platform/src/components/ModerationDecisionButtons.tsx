"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CreatorProfileDecision({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function decide(approve: boolean) {
    setLoading(true);
    const reason = approve ? undefined : window.prompt("Motif du rejet ?") ?? "Non conforme";
    await fetch(`/api/admin/creator-profile/${profileId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve, reason }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={loading}
        onClick={() => decide(true)}
        className="rounded-full bg-green-600 px-3 py-1 text-xs font-medium hover:bg-green-500 disabled:opacity-50"
      >
        Approuver
      </button>
      <button
        disabled={loading}
        onClick={() => decide(false)}
        className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium hover:bg-red-500 disabled:opacity-50"
      >
        Rejeter
      </button>
    </div>
  );
}

export function ReportDecision({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function decide(status: "ACTIONED" | "DISMISSED") {
    setLoading(true);
    await fetch(`/api/admin/reports/${reportId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <button
        disabled={loading}
        onClick={() => decide("ACTIONED")}
        className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium hover:bg-red-500 disabled:opacity-50"
      >
        Traiter (action)
      </button>
      <button
        disabled={loading}
        onClick={() => decide("DISMISSED")}
        className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium hover:bg-white/5 disabled:opacity-50"
      >
        Classer sans suite
      </button>
    </div>
  );
}
