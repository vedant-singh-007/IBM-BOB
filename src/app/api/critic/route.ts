import { NextRequest, NextResponse } from "next/server";
import { requireAuth, enforceRateLimit, apiError } from "@/lib/api-helpers";
import { reviewContent, improveContent } from "@/lib/ai/service";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const ReviewSchema = z.object({
  assetId: z.string().uuid(),
  objective: z.string().max(500).optional(),
});

const ImproveSchema = z.object({
  assetId: z.string().uuid(),
  instruction: z.string().min(1).max(500),
  saveRevision: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  const rateLimitError = enforceRateLimit(user!.id);
  if (rateLimitError) return rateLimitError;

  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "review";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body");
  }

  const supabase = await createClient();

  if (action === "improve") {
    const parsed = ImproveSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues.map((i) => i.message).join("; "));

    const { assetId, instruction, saveRevision } = parsed.data;

    // Ownership check
    const { data: asset } = await supabase
      .from("content_assets")
      .select("*")
      .eq("id", assetId)
      .eq("user_id", user!.id)
      .single();
    if (!asset) return apiError("Asset not found", 404);

    // Fetch brand profile
    let brandProfile = null;
    if (asset.brand_profile_id) {
      const { data } = await supabase
        .from("brand_profiles")
        .select("*")
        .eq("id", asset.brand_profile_id)
        .eq("user_id", user!.id)
        .single();
      brandProfile = data;
    }

    let improved: string;
    try {
      improved = await improveContent(asset.content, instruction, brandProfile);
    } catch (err: unknown) {
      return apiError(err instanceof Error ? err.message : "Improvement failed", 503);
    }

    if (saveRevision) {
      // Save current as revision then update
      await supabase.from("content_revisions").insert({
        asset_id: asset.id,
        user_id: user!.id,
        content: asset.content,
        note: `Before: ${instruction}`,
      });

      await supabase
        .from("content_assets")
        .update({ content: improved, word_count: improved.split(/\s+/).length })
        .eq("id", assetId)
        .eq("user_id", user!.id);
    }

    return NextResponse.json({ improved });
  }

  // Default: review
  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues.map((i) => i.message).join("; "));

  const { assetId, objective } = parsed.data;

  const { data: asset } = await supabase
    .from("content_assets")
    .select("*")
    .eq("id", assetId)
    .eq("user_id", user!.id)
    .single();
  if (!asset) return apiError("Asset not found", 404);

  let brandProfile = null;
  if (asset.brand_profile_id) {
    const { data } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("id", asset.brand_profile_id)
      .single();
    brandProfile = data;
  }

  let review;
  try {
    review = await reviewContent(asset.content, {
      objective,
      platform: asset.platform ?? undefined,
      brand: brandProfile,
    });
  } catch (err: unknown) {
    return apiError(err instanceof Error ? err.message : "Review failed", 503);
  }

  // Save review to DB
  const { data: saved } = await supabase
    .from("critic_reviews")
    .insert({
      asset_id: assetId,
      user_id: user!.id,
      findings: review.findings as unknown as import("@/lib/supabase/database.types").CriticFinding[],
      overall: review.overall,
    })
    .select()
    .single();

  return NextResponse.json({ review: saved ?? { findings: review.findings, overall: review.overall } });
}
