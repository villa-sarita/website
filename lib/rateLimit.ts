/**
 * Tiny in-memory sliding-window rate limiter, keyed by IP.
 *
 * Single-process only — fine on a VPS or single-container deploy.
 * For multi-instance serverless (Vercel), swap this for Upstash Ratelimit
 * (Redis-backed) — the signature can stay identical.
 */

interface Window {
  count: number;
  resetAt: number;
}

const globalForLimiter = globalThis as unknown as {
  __villaSaritaRateLimit?: Map<string, Window>;
};

function getStore(): Map<string, Window> {
  if (!globalForLimiter.__villaSaritaRateLimit) {
    globalForLimiter.__villaSaritaRateLimit = new Map();
  }
  return globalForLimiter.__villaSaritaRateLimit;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfter: number; // seconds until window resets
}

/**
 * Allow `limit` requests per `windowMs` per key.
 * Defaults: 10 requests per minute.
 */
export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): RateLimitResult {
  const now = Date.now();
  const store = getStore();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    // Cheap housekeeping — drop a stale random entry sometimes.
    if (Math.random() < 0.05) {
      for (const [k, v] of store) {
        if (v.resetAt <= now) store.delete(k);
      }
    }
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { ok: true, remaining: limit - entry.count, retryAfter: 0 };
}

export function getClientIp(request: Request): string {
  // Common proxy headers, then a fallback so the limiter still works in dev.
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    'unknown'
  );
}
