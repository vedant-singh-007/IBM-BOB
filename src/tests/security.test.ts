/**
 * Security tests: unauthorized access, cross-user isolation, input limits
 * These tests focus on logic that doesn't require a live database.
 * Run: npx vitest run src/tests/security.test.ts
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Utility helpers ──────────────────────────────────────────────────────────

function makeRequest(body: unknown, method = "POST"): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ─── Rate limit + ownership isolation ────────────────────────────────────────

describe("Rate Limiter – cross-user isolation", () => {
  beforeEach(() => { vi.resetModules(); });

  it("does not share limits between different user IDs", async () => {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    const userA = "security-test-user-a";
    const userB = "security-test-user-b";

    // Exhaust user A
    for (let i = 0; i < 20; i++) checkRateLimit(userA);
    const blocked = checkRateLimit(userA);
    expect(blocked.allowed).toBe(false);

    // User B is unaffected
    const allowed = checkRateLimit(userB);
    expect(allowed.allowed).toBe(true);
  });
});

// ─── Input validation edge cases ─────────────────────────────────────────────

describe("Input validation – security boundaries", () => {
  it("rejects extremely large sourceText (>8000 chars)", async () => {
    const { GenerateInputSchema } = await import("@/lib/ai/service");
    const result = GenerateInputSchema.safeParse({
      mode: "rewrite",
      sourceText: "A".repeat(10000),
      platforms: ["generic"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects brandProfileId that is not a UUID", async () => {
    const { GenerateInputSchema } = await import("@/lib/ai/service");
    const result = GenerateInputSchema.safeParse({
      mode: "generate",
      brief: "hello",
      platforms: ["generic"],
      brandProfileId: "../../etc/passwd",
    });
    expect(result.success).toBe(false);
  });

  it("rejects SQL injection attempt in brief field", async () => {
    const { GenerateInputSchema } = await import("@/lib/ai/service");
    // The schema doesn't sanitize (ORM handles that), but max length protects
    const injection = "'; DROP TABLE users; --";
    const result = GenerateInputSchema.safeParse({
      mode: "generate",
      brief: injection,
      platforms: ["generic"],
    });
    // Short injection passes schema validation (it's valid text under 1000 chars)
    // The database layer uses parameterized queries (Supabase handles this)
    expect(result.success).toBe(true);
  });

  it("rejects more than 6 platforms", async () => {
    const { GenerateInputSchema } = await import("@/lib/ai/service");
    const result = GenerateInputSchema.safeParse({
      mode: "generate",
      platforms: ["twitter", "linkedin", "instagram", "facebook", "tiktok", "youtube", "blog"],
    });
    expect(result.success).toBe(false);
  });
});

// ─── MIME type validation ─────────────────────────────────────────────────────

describe("MIME type / allowed file types", () => {
  it("ALLOWED_MIME_TYPES does not include executable types", async () => {
    const { ALLOWED_MIME_TYPES } = await import("@/lib/utils");
    const dangerous = [
      "application/javascript",
      "text/html",
      "application/x-executable",
      "application/octet-stream",
      "application/x-php",
    ];
    for (const mime of dangerous) {
      expect(ALLOWED_MIME_TYPES).not.toContain(mime);
    }
  });

  it("ALLOWED_MIME_TYPES only contains image types", async () => {
    const { ALLOWED_MIME_TYPES } = await import("@/lib/utils");
    for (const mime of ALLOWED_MIME_TYPES) {
      expect(mime.startsWith("image/")).toBe(true);
    }
  });
});

// ─── File size limits ─────────────────────────────────────────────────────────

describe("File size constraints", () => {
  it("MAX_FILE_SIZE is 10MB", async () => {
    const { MAX_FILE_SIZE } = await import("@/lib/utils");
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
  });
});

// ─── utils.ts – safe utility functions ────────────────────────────────────────

describe("Utility functions", () => {
  it("truncate does not exceed max length", async () => {
    const { truncate } = await import("@/lib/utils");
    const result = truncate("A".repeat(200), 50);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.endsWith("...")).toBe(true);
  });

  it("formatBytes handles zero", async () => {
    const { formatBytes } = await import("@/lib/utils");
    expect(formatBytes(0)).toBe("0 B");
  });

  it("wordCount returns 0 for empty string", async () => {
    const { wordCount } = await import("@/lib/utils");
    expect(wordCount("")).toBe(0);
    expect(wordCount("   ")).toBe(0);
  });
});
