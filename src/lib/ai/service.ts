/**
 * Server-side AI service – all LLM calls happen here.
 * The OpenAI key is never sent to the browser.
 */

import OpenAI from "openai";
import { z } from "zod";
import type { BrandProfile } from "@/lib/supabase/database.types";

// ─── Configuration ────────────────────────────────────────────────────────────

const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";
const MAX_TOKENS = 2000;
const TIMEOUT_MS = 30_000;

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("AI provider is not configured (OPENAI_API_KEY missing).");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
    timeout: TIMEOUT_MS,
    maxRetries: 1,
  });
}

// ─── Input Schemas ────────────────────────────────────────────────────────────

const PLATFORM_VALUES = [
  "twitter",
  "linkedin",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "blog",
  "email",
  "generic",
] as const;

export const GenerateInputSchema = z.object({
  mode: z.enum(["generate", "rewrite", "summarize", "repurpose"]),
  brief: z.string().max(1000).optional(),
  sourceText: z.string().max(8000).optional(),
  tone: z.string().max(100).optional(),
  language: z.string().max(10).default("en"),
  targetAudience: z.string().max(300).optional(),
  desiredLength: z.enum(["short", "medium", "long"]).default("medium"),
  platforms: z.array(z.enum(PLATFORM_VALUES)).max(6).default(["generic"]),
  brandProfileId: z.string().uuid().optional(),
});

export type GenerateInput = z.infer<typeof GenerateInputSchema>;

export interface GeneratedAsset {
  platform: string;
  content: string;
  wordCount: number;
}

export interface GenerateResult {
  assets: GeneratedAsset[];
  strategy?: string;
}

// ─── Campaign DNA Schema ──────────────────────────────────────────────────────

export const CampaignBriefSchema = z.object({
  objective: z.string().min(1).max(500),
  product: z.string().max(300).optional(),
  targetAudience: z.string().max(300).optional(),
  coreMessage: z.string().max(500).optional(),
  callToAction: z.string().max(200).optional(),
  platforms: z.array(z.enum(PLATFORM_VALUES)).max(6).default(["generic"]),
  brandProfileId: z.string().uuid().optional(),
});

export type CampaignBrief = z.infer<typeof CampaignBriefSchema>;

export interface CampaignAsset {
  type: "post" | "email" | "blog_outline";
  platform: string;
  content: string;
}

export interface CampaignGenerateResult {
  strategy: string;
  assets: CampaignAsset[];
}

// ─── Critic Schema ────────────────────────────────────────────────────────────

export interface CriticFinding {
  category: string;
  severity: "info" | "warning" | "error";
  description: string;
  suggestion: string | null;
}

export interface CriticResult {
  findings: CriticFinding[];
  overall: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function brandContext(brand?: BrandProfile | null): string {
  if (!brand) return "";
  const parts: string[] = [`Brand: ${brand.name}`];
  if (brand.description) parts.push(`Description: ${brand.description}`);
  if (brand.tone) parts.push(`Tone: ${brand.tone}`);
  if (brand.guidelines) parts.push(`Guidelines: ${brand.guidelines}`);
  if (brand.target_audience) parts.push(`Target audience: ${brand.target_audience}`);
  if (brand.preferred_vocabulary?.length)
    parts.push(`Preferred vocabulary: ${brand.preferred_vocabulary.join(", ")}`);
  if (brand.words_to_avoid?.length)
    parts.push(`Words/phrases to AVOID: ${brand.words_to_avoid.join(", ")}`);
  if (brand.example_posts?.length)
    parts.push(`Example approved post:\n${brand.example_posts[0]}`);
  return `\n\n[Brand Context]\n${parts.join("\n")}`;
}

function lengthInstruction(length: "short" | "medium" | "long", platform: string): string {
  const map: Record<string, Record<string, string>> = {
    twitter: { short: "under 140 chars", medium: "150–280 chars", long: "280 chars max" },
    linkedin: { short: "~150 words", medium: "200–400 words", long: "400–700 words" },
    instagram: { short: "~50 words caption", medium: "100–200 words", long: "200–300 words" },
    email: { short: "~150 words", medium: "250–400 words", long: "500–800 words" },
    blog: { short: "~300 words", medium: "600–900 words", long: "1000–1500 words" },
    generic: { short: "~100 words", medium: "200–350 words", long: "500–800 words" },
  };
  const base = map[platform] ?? map.generic;
  return base[length];
}

async function chat(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = MAX_TOKENS
): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("AI returned an empty response.");
  return text.trim();
}

// ─── Core Generation ──────────────────────────────────────────────────────────

export async function generateContent(
  input: GenerateInput,
  brand?: BrandProfile | null
): Promise<GenerateResult> {
  const systemPrompt =
    `You are an expert content creator and copywriter.` +
    `${brandContext(brand)}\n\n` +
    `Always return ONLY the requested content. No preamble, no meta-commentary.`;

  const assets: GeneratedAsset[] = [];

  for (const platform of input.platforms) {
    const lengthHint = lengthInstruction(input.desiredLength, platform);
    let userPrompt = "";

    switch (input.mode) {
      case "generate":
        userPrompt =
          `Write a ${platform} post.\n` +
          `Brief: ${input.brief ?? "No brief provided"}\n` +
          `Tone: ${input.tone ?? "professional"}\n` +
          `Target audience: ${input.targetAudience ?? "general"}\n` +
          `Language: ${input.language}\n` +
          `Length: ${lengthHint}`;
        break;
      case "rewrite":
        userPrompt =
          `Rewrite the following text for ${platform}:\n\n${input.sourceText}\n\n` +
          `Tone: ${input.tone ?? "professional"}, Length: ${lengthHint}`;
        break;
      case "summarize":
        userPrompt =
          `Summarize the following text for ${platform}.\n\n${input.sourceText}\n\n` +
          `Length: ${lengthHint}, Language: ${input.language}`;
        break;
      case "repurpose":
        userPrompt =
          `Repurpose the following long-form content for ${platform}:\n\n${input.sourceText}\n\n` +
          `Adapt format, tone, and length. Length target: ${lengthHint}`;
        break;
    }

    const content = await chat(systemPrompt, userPrompt);
    assets.push({ platform, content, wordCount: content.split(/\s+/).length });
  }

  return { assets };
}

// ─── Campaign DNA ─────────────────────────────────────────────────────────────

export async function generateCampaign(
  brief: CampaignBrief,
  brand?: BrandProfile | null
): Promise<CampaignGenerateResult> {
  const brandCtx = brandContext(brand);

  // Step 1: Generate a shared strategy
  const strategyPrompt =
    `You are a strategic content director. Given the campaign brief, write a concise ` +
    `campaign strategy (2–3 paragraphs) covering: positioning, key messages, tone, and ` +
    `how to adapt it across platforms. Return only the strategy text.${brandCtx}`;

  const strategyUser =
    `Objective: ${brief.objective}\n` +
    `Product/Subject: ${brief.product ?? "N/A"}\n` +
    `Target audience: ${brief.targetAudience ?? "general"}\n` +
    `Core message: ${brief.coreMessage ?? "N/A"}\n` +
    `CTA: ${brief.callToAction ?? "N/A"}`;

  const strategy = await chat(strategyPrompt, strategyUser, 600);

  // Step 2: Generate per-platform posts
  const assets: CampaignAsset[] = [];

  for (const platform of brief.platforms) {
    const isEmail = platform === "email";
    const isBlog = platform === "blog";
    const type: CampaignAsset["type"] = isEmail
      ? "email"
      : isBlog
      ? "blog_outline"
      : "post";

    const platformPrompt =
      `You are an expert ${platform} copywriter. Using the campaign strategy below, ` +
      `write ${isEmail ? "a promotional email draft" : isBlog ? "a structured blog outline (with headings and bullet-point subpoints)" : `a compelling ${platform} post`}.` +
      ` Maintain the core message and CTA but adapt format and tone for ${platform}.${brandCtx}`;

    const platformUser =
      `Campaign strategy:\n${strategy}\n\n` +
      `Brief: ${brief.objective}\n` +
      `CTA: ${brief.callToAction ?? "N/A"}`;

    const content = await chat(platformPrompt, platformUser, 800);
    assets.push({ type, platform, content });
  }

  // Always add email and blog_outline if not already present
  if (!brief.platforms.includes("email")) {
    const content = await chat(
      `Write a promotional email draft for the campaign.${brandCtx}`,
      `Strategy:\n${strategy}\nCTA: ${brief.callToAction ?? "N/A"}`,
      600
    );
    assets.push({ type: "email", platform: "email", content });
  }

  if (!brief.platforms.includes("blog")) {
    const content = await chat(
      `Write a blog post outline (headings and bullet points) for the campaign.${brandCtx}`,
      `Strategy:\n${strategy}`,
      600
    );
    assets.push({ type: "blog_outline", platform: "blog", content });
  }

  return { strategy, assets };
}

// ─── Content Critic ───────────────────────────────────────────────────────────

export async function reviewContent(
  content: string,
  context: {
    objective?: string;
    platform?: string;
    brand?: BrandProfile | null;
  }
): Promise<CriticResult> {
  const brandCtx = brandContext(context.brand);
  const systemPrompt =
    `You are an expert content critic. Evaluate the provided content and return a ` +
    `JSON object with this exact shape:\n` +
    `{\n` +
    `  "findings": [\n` +
    `    {\n` +
    `      "category": "Brand Voice" | "Readability" | "Platform Fit" | "Weak Wording" | "Factual Claims" | "Objective Alignment",\n` +
    `      "severity": "info" | "warning" | "error",\n` +
    `      "description": "concise description of the issue",\n` +
    `      "suggestion": "actionable improvement or null"\n` +
    `    }\n` +
    `  ],\n` +
    `  "overall": "overall assessment in 1-2 sentences"\n` +
    `}\n\n` +
    `IMPORTANT: These are heuristic evaluations, not objective predictions. ` +
    `Be helpful but honest. Return ONLY valid JSON.${brandCtx}`;

  const userPrompt =
    `Content to review:\n\n${content.slice(0, 4000)}\n\n` +
    `Platform: ${context.platform ?? "generic"}\n` +
    `Campaign objective: ${context.objective ?? "not specified"}`;

  const raw = await chat(systemPrompt, userPrompt, 1000);

  // Parse and validate JSON response
  let parsed: unknown;
  try {
    // Extract JSON from potential markdown fences
    const jsonMatch = raw.match(/```json\n?([\s\S]*?)```/) ??
      raw.match(/```\n?([\s\S]*?)```/) ??
      [null, raw];
    parsed = JSON.parse(jsonMatch[1] ?? raw);
  } catch {
    throw new Error("AI returned malformed review JSON. Please try again.");
  }

  const CriticResultSchema = z.object({
    findings: z.array(
      z.object({
        category: z.string(),
        severity: z.enum(["info", "warning", "error"]),
        description: z.string(),
        suggestion: z.string().nullable(),
      })
    ),
    overall: z.string(),
  });

  const result = CriticResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("AI review response did not match expected structure.");
  }

  return result.data;
}

// ─── AI Media Description ─────────────────────────────────────────────────────

export async function describeImage(
  imageBase64: string,
  mimeType: string
): Promise<{ description: string; tags: string[] }> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: AI_MODEL,
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: 'Describe this image concisely in 1-2 sentences, then list 5-8 relevant tags. Return JSON: {"description":"...","tags":["..."]}',
          },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? raw);
    return {
      description: String(parsed.description ?? ""),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
    };
  } catch {
    return { description: raw.slice(0, 500), tags: [] };
  }
}

// ─── Targeted Improvement ────────────────────────────────────────────────────

export async function improveContent(
  content: string,
  instruction: string,
  brand?: BrandProfile | null
): Promise<string> {
  const systemPrompt =
    `You are an expert editor. Apply the requested improvement to the content. ` +
    `Return ONLY the improved content, no commentary.${brandContext(brand)}`;
  return chat(systemPrompt, `Instruction: ${instruction}\n\nContent:\n${content.slice(0, 4000)}`);
}
