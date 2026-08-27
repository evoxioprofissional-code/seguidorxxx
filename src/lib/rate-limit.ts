import "server-only";

/**
 * Rate limiter em memória (best-effort, por instância).
 * Para produção multi-instância, trocar por Redis/Upstash.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  b.count += 1;
  if (b.count > limit) return { ok: false, remaining: 0 };
  return { ok: true, remaining: limit - b.count };
}
