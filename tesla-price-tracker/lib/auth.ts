import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// Authentification par lien magique, sans table de session en base :
// le jeton (lien envoyé par email, puis cookie de session) est signé avec
// AUTH_SECRET (HMAC-SHA256). Sa signature garantit qu'il n'a pas été forgé
// ni modifié, et sa date d'expiration embarquée le rend inutilisable après
// coup — pas besoin de stocker/révoquer quoi que ce soit côté serveur.
//
// Compromis assumé : contrairement à un jeton à usage unique stocké en
// base, un lien magique reste valable (15 min) s'il est intercepté et
// rejoué plusieurs fois dans cette fenêtre. Pour une app à cet enjeu, c'est
// un compromis raisonnable ; si besoin d'un vrai usage unique plus tard,
// ajouter une table MagicLinkToken en base avec marquage "consommé".

const SECRET = process.env.AUTH_SECRET;

if (!SECRET) {
  throw new Error("AUTH_SECRET manquant dans les variables d'environnement");
}

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours
export const SESSION_COOKIE_NAME = "session";

function sign(payload: string): string {
  return createHmac("sha256", SECRET as string).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function createToken(email: string, ttlMs: number): string {
  const payload = JSON.stringify({ email, exp: Date.now() + ttlMs });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function verifyToken(token: string): { email: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;

  if (!safeEqual(sign(encoded), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (typeof payload.email !== "string" || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

export function createMagicLinkToken(email: string): string {
  return createToken(email, MAGIC_LINK_TTL_MS);
}

export function verifyMagicLinkToken(token: string): { email: string } | null {
  return verifyToken(token);
}

export function createSessionToken(email: string): string {
  return createToken(email, SESSION_TTL_MS);
}

export function verifySessionToken(token: string): { email: string } | null {
  return verifyToken(token);
}

// À utiliser dans les Route Handlers pour récupérer l'email de l'utilisateur
// connecté à partir du cookie de session — jamais depuis un champ envoyé
// par le client (body/query), qui pourrait être falsifié.
export function getSessionEmail(): string | null {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token)?.email ?? null;
}
