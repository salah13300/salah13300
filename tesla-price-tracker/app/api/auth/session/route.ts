import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/auth";

// GET /api/auth/session
// Renvoie l'email de la session en cours si le visiteur est connecté.
// Utilisé par le front pour savoir quel écran afficher sur /compte.
export async function GET() {
  const email = getSessionEmail();

  if (!email) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, email });
}
