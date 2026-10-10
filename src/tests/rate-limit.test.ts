/**
 * Rate limiter unit tests
 * Run: npx vitest run src/tests/rate-limit.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to reset the module between tests to clear the in-memory map
describe("Rate Limiter", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("allows requests under the limit", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = checkRateLimit("user-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("tracks remaining count", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const r1 = checkRateLimit("user-count");
    const r2 = checkRateLimit("user-count");
    expect(r2.remaining).toBe(r1.remaining - 1);
  });

  it("isolates counters per user", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const a = checkRateLimit("user-a");
    const b = checkRateLimit("user-b");
    // Both should be allowed independently
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it("blocks requests after limit is exceeded", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const userId = "user-exhaust-" + Math.random();
    // Exhaust the limit (20 requests)
    let last;
    for (let i = 0; i < 20; i++) {
      last = checkRateLimit(userId);
    }
    expect(last!.remaining).toBe(0);
    const blocked = checkRateLimit(userId);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("provides resetAt in the future", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const result = checkRateLimit("user-reset");
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});

describe("getRateLimitHeaders", () => {
  it("returns correct header keys", async () => {
    const { getRateLimitHeaders, checkRateLimit } = await import("@/lib/rate-limit");
    const result = checkRateLimit("user-headers");
    const headers = getRateLimitHeaders(result);
    expect(headers["X-RateLimit-Limit"]).toBeDefined();
    expect(headers["X-RateLimit-Remaining"]).toBeDefined();
    expect(headers["X-RateLimit-Reset"]).toBeDefined();
  });
});
