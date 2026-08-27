/**
 * Rate limiting с двумя бэкендами.
 *
 * По умолчанию — простой in-memory sliding window. Он живёт в памяти процесса,
 * а на Vercel serverless инстансы НЕ делят память и сбрасываются на cold start,
 * поэтому это лишь барьер против быстрого перебора в рамках одного тёплого
 * инстанса, а не строгая гарантия.
 *
 * Если заданы UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN, счётчики
 * уезжают в Upstash Redis и лимит становится общим для всех инстансов. При
 * недоступности Redis — откат на in-memory (fail-open превратил бы лимит в
 * фикцию ровно в момент атаки).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

type SlidingWindowDuration = Parameters<typeof Ratelimit.slidingWindow>[1];

const upstashConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!upstashConfigured) return null;

  const cacheKey = `${limit}:${windowMs}`;
  const cached = limiters.get(cacheKey);
  if (cached) return cached;

  redis = redis ?? Redis.fromEnv();
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
      limit,
      `${windowMs} ms` as SlidingWindowDuration
    ),
    prefix: `kb:rl:${cacheKey}`,
    analytics: false,
  });
  limiters.set(cacheKey, limiter);
  return limiter;
}

/** In-memory sliding window — бэкенд по умолчанию и запасной путь. */
function rateLimitInMemory(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { allowed: false, retryAfterMs: windowMs - (now - hits[0]) };
  }

  hits.push(now);
  buckets.set(key, hits);

  // Не даём Map расти бесконечно: изредка вычищаем протухшие ключи.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }

  return { allowed: true, retryAfterMs: 0 };
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const limiter = getUpstashLimiter(limit, windowMs);

  if (limiter) {
    try {
      const res = await limiter.limit(key);
      return res.success
        ? { allowed: true, retryAfterMs: 0 }
        : { allowed: false, retryAfterMs: Math.max(0, res.reset - Date.now()) };
    } catch (err) {
      console.error("[rate-limit] Upstash недоступен, откат на in-memory:", err);
    }
  }

  return rateLimitInMemory(key, limit, windowMs);
}

/** Достаёт клиентский IP из заголовков (за прокси Vercel). */
export function clientIp(headers: Headers | Record<string, string | undefined>): string {
  const get = (name: string): string | undefined =>
    headers instanceof Headers ? headers.get(name) ?? undefined : headers[name];
  const fwd = get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || get("x-real-ip") || "unknown";
}
