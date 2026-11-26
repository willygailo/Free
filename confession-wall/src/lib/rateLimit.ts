const DEFAULT_MAX_REQUESTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

const requestLog = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const existing = requestLog.get(key) ?? [];
  const active = existing.filter((timestamp) => timestamp > windowStart);

  if (active.length >= maxRequests) {
    requestLog.set(key, active);
    const oldest = active[0] ?? now;
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + windowMs,
    };
  }

  active.push(now);
  requestLog.set(key, active);

  // Opportunistic cleanup to keep map bounded
  if (requestLog.size > 1000) {
    requestLog.forEach((timestamps, mapKey) => {
      const valid = timestamps.filter((t) => t > windowStart);
      if (valid.length === 0) {
        requestLog.delete(mapKey);
      } else {
        requestLog.set(mapKey, valid);
      }
    });
  }

  const oldest = active[0] ?? now;
  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - active.length),
    resetAt: oldest + windowMs,
  };
}

export function resetRateLimitStore(): void {
  requestLog.clear();
}
