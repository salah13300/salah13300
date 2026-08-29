import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiting best-effort : sans UPSTASH_REDIS_REST_URL/TOKEN configurés,
// cette fonction n'a AUCUN effet (elle autorise toujours) — le site reste
// fonctionnel, mais sans cette protection contre le spam/l'abus. Pour
// l'activer : créer une base Redis gratuite sur https://console.upstash.com
// (Create Database → région proche de ton déploiement Vercel → onglet REST
// API) puis renseigner les deux variables d'environnement.
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const limiters = new Map<string, Ratelimit>();

function getLimiter(bucket: string, limit: number, windowSeconds: number): Ratelimit | null {
  if (!redis) return null;

  const key = `${bucket}:${limit}:${windowSeconds}`;
  let limiter = limiters.get(key);

  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `ratelimit:${bucket}`,
    });
    limiters.set(key, limiter);
  }

  return limiter;
}

function getClientIp(request: Request): string {
  // Vercel renseigne x-forwarded-for avec l'IP réelle du visiteur en tête.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

/**
 * Limite le nombre d'appels par IP pour une route sensible.
 * Retourne `true` si la requête doit être rejetée (429 à renvoyer).
 * Sans Upstash configuré, ne limite jamais (voir commentaire en tête de
 * fichier) — à configurer avant une mise en prod publique.
 */
export async function isRateLimited(
  request: Request,
  bucket: string,
  { limit = 10, windowSeconds = 60 }: { limit?: number; windowSeconds?: number } = {}
): Promise<boolean> {
  const limiter = getLimiter(bucket, limit, windowSeconds);
  if (!limiter) return false;

  const ip = getClientIp(request);
  const { success } = await limiter.limit(`${bucket}:${ip}`);
  return !success;
}
