/**
 * Per-user in-memory rate limiter.
 * 
 * NOTE: This is a local, in-process rate limiter suitable for single-instance
 * development and testing. In a multi-instance or serverless deployment (e.g.
 * Vercel), each instance maintains its own counter and the effective limit
 * will be WINDOW_MAX × number_of_instances. For production, replace this
 * with a distributed limiter backed by Redis or Upstash.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

// userId → bucket
const buckets = new Map<string, Bucket>();

// Clean up old entries periodically to avoid memory leaks
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setTimeout(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (bucket.resetAt < now) buckets.delete(key);
    }
    cleanupTimer = null;
  }, 60_000);
}

const WINDOW_MS = 60_000; // 1 minute
const WINDOW_MAX = 20;    // 20 AI requests per user per minute

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(userId);

  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(userId, bucket);
    scheduleCleanup();
  }

  if (bucket.count >= WINDOW_MAX) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: WINDOW_MAX - bucket.count,
    resetAt: bucket.resetAt,
  };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(WINDOW_MAX),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
