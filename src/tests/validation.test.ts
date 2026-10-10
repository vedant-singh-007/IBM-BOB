/**
 * Input validation tests using Zod schemas from the AI service
 * Run: npx vitest run src/tests/validation.test.ts
 */
import { describe, it, expect } from "vitest";
import { GenerateInputSchema, CampaignBriefSchema } from "@/lib/ai/service";

describe("GenerateInputSchema", () => {
  it("accepts valid generate input", () => {
    const result = GenerateInputSchema.safeParse({
      mode: "generate",
      brief: "Write about our new product",
      tone: "professional",
      language: "en",
      platforms: ["linkedin"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid mode", () => {
    const result = GenerateInputSchema.safeParse({
      mode: "invalid_mode",
      platforms: ["linkedin"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects too many platforms (7 > max 6)", () => {
    const result = GenerateInputSchema.safeParse({
      mode: "generate",
      platforms: ["twitter", "linkedin", "instagram", "facebook", "tiktok", "youtube", "blog"],
    });
    // With 7 platforms and max(6), this must fail
    expect(result.success).toBe(false);
  });

  it("rejects oversized brief", () => {
    const result = GenerateInputSchema.safeParse({
      mode: "generate",
      brief: "x".repeat(1001),
      platforms: ["generic"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects oversized sourceText", () => {
    const result = GenerateInputSchema.safeParse({
      mode: "rewrite",
      sourceText: "x".repeat(8001),
      platforms: ["generic"],
    });
    expect(result.success).toBe(false);
  });

  it("applies defaults for optional fields", () => {
    const result = GenerateInputSchema.safeParse({
      mode: "generate",
      platforms: ["generic"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("en");
      expect(result.data.desiredLength).toBe("medium");
    }
  });

  it("rejects invalid platform value", () => {
    const result = GenerateInputSchema.safeParse({
      mode: "generate",
      platforms: ["snapchat"], // not in allowed list
    });
    expect(result.success).toBe(false);
  });
});

describe("CampaignBriefSchema", () => {
  it("accepts valid campaign brief", () => {
    const result = CampaignBriefSchema.safeParse({
      objective: "Launch new SaaS product",
      platforms: ["linkedin", "email"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty objective", () => {
    const result = CampaignBriefSchema.safeParse({
      objective: "",
      platforms: ["linkedin"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects oversized objective", () => {
    const result = CampaignBriefSchema.safeParse({
      objective: "x".repeat(501),
      platforms: ["linkedin"],
    });
    expect(result.success).toBe(false);
  });

  it("applies default platforms", () => {
    const result = CampaignBriefSchema.safeParse({
      objective: "Test objective",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.data.platforms)).toBe(true);
    }
  });
});
