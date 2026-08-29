"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import AgeGate from "@/components/AgeGate";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AgeGate />
      {children}
    </SessionProvider>
  );
}
