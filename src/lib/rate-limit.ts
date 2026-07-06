/**
 * Простой in-memory rate limiter (sliding window).
 *
 * ВНИМАНИЕ: состояние живёт в памяти процесса. На Vercel serverless инстансы НЕ
 * делят память и сбрасываются на cold start — поэтому это базовый барьер против
 * быстрого перебора в рамках одного тёплого инстанса, а НЕ строгая гарантия.
 * Для полноценной защиты нужен внешний стор (Upstash Redis + @upstash/ratelimit).
 */

const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function rateLimit(
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

/** Достаёт клиентский IP из заголовков (за прокси Vercel). */
export function clientIp(headers: Headers | Record<string, string | undefined>): string {
  const get = (name: string): string | undefined =>
    headers instanceof Headers ? headers.get(name) ?? undefined : headers[name];
  const fwd = get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || get("x-real-ip") || "unknown";
}
