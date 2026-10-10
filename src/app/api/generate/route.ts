import { NextRequest, NextResponse } from "next/server";
import { requireAuth, enforceRateLimit, apiError } from "@/lib/api-helpers";
import { generateContent, GenerateInputSchema } from "@/lib/ai/service";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const RequestSchema = GenerateInputSchema.extend({
  title: z.string().max(200).optional(),
  campaignId: z.string().uuid().optional(),
  saveToDb: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  // Rate limiting
  const rateLimitError = enforceRateLimit(user!.id);
  if (rateLimitError) return rateLimitError;

  // Validate request body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body");
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues.map((i) => i.message).join("; "));
  }

  const input = parsed.data;

  // Fetch brand profile if provided
  let brandProfile = null;
  if (input.brandProfileId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("id", input.brandProfileId)
      .eq("user_id", user!.id)
      .single();
    if (error || !data) return apiError("Brand profile not found or access denied", 403);
    brandProfile = data;
  }

  // Generate content
  let result;
  try {
    result = await generateContent(input, brandProfile);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "AI generation failed";
    // Don't leak provider details
    if (msg.includes("API key") || msg.includes("not configured")) {
      return apiError("AI provider is not configured. Please check your environment variables.", 503);
    }
    return apiError(msg, 503);
  }

  // Persist to database
  if (input.saveToDb) {
    const supabase = await createClient();
    const inserts = result.assets.map((asset) => ({
      user_id: user!.id,
      campaign_id: input.campaignId ?? null,
      brand_profile_id: input.brandProfileId ?? null,
      title: input.title ?? `${asset.platform} – ${new Date().toLocaleDateString()}`,
      content: asset.content,
      asset_type: (input.mode === "generate" ? "post" : input.mode === "summarize" ? "summary" : "repurposed") as "post" | "email" | "blog_outline" | "summary" | "repurposed" | "custom",
      platform: asset.platform,
      tone: input.tone ?? null,
      language: input.language,
      target_audience: input.targetAudience ?? null,
      brief: input.brief ?? null,
      status: "draft" as const,
      word_count: asset.wordCount,
    }));

    const { data: saved, error: dbError } = await supabase
      .from("content_assets")
      .insert(inserts)
      .select();

    if (dbError) {
      return apiError("Content generated but could not be saved: " + dbError.message, 500);
    }

    return NextResponse.json({ assets: saved, generated: result.assets });
  }

  return NextResponse.json({ generated: result.assets });
}
