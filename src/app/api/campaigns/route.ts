import { NextRequest, NextResponse } from "next/server";
import { requireAuth, enforceRateLimit, apiError } from "@/lib/api-helpers";
import { generateCampaign, CampaignBriefSchema } from "@/lib/ai/service";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const RequestSchema = CampaignBriefSchema.extend({
  name: z.string().min(1).max(200),
});

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  const rateLimitError = enforceRateLimit(user!.id);
  if (rateLimitError) return rateLimitError;

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

  const { name, ...briefData } = parsed.data;

  // Fetch brand profile if provided
  let brandProfile = null;
  if (briefData.brandProfileId) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("brand_profiles")
      .select("*")
      .eq("id", briefData.brandProfileId)
      .eq("user_id", user!.id)
      .single();
    if (error || !data) return apiError("Brand profile not found or access denied", 403);
    brandProfile = data;
  }

  // Generate campaign
  let campaignResult;
  try {
    campaignResult = await generateCampaign(briefData, brandProfile);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Campaign generation failed";
    if (msg.includes("not configured")) {
      return apiError("AI provider is not configured.", 503);
    }
    return apiError(msg, 503);
  }

  // Persist campaign and assets
  const supabase = await createClient();

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      user_id: user!.id,
      brand_profile_id: briefData.brandProfileId ?? null,
      name,
      objective: briefData.objective,
      product: briefData.product ?? null,
      target_audience: briefData.targetAudience ?? null,
      core_message: briefData.coreMessage ?? null,
      call_to_action: briefData.callToAction ?? null,
      platforms: briefData.platforms,
      strategy: campaignResult.strategy,
      status: "draft",
    })
    .select()
    .single();

  if (campaignError || !campaign) {
    return apiError("Failed to create campaign: " + (campaignError?.message ?? "unknown"), 500);
  }

  const assetInserts = campaignResult.assets.map((a) => ({
    user_id: user!.id,
    campaign_id: campaign.id,
    brand_profile_id: briefData.brandProfileId ?? null,
    title: `${a.platform} – ${name}`,
    content: a.content,
    asset_type: a.type as "post" | "email" | "blog_outline",
    platform: a.platform,
    status: "draft" as const,
    word_count: a.content.split(/\s+/).length,
  }));

  const { data: assets, error: assetsError } = await supabase
    .from("content_assets")
    .insert(assetInserts)
    .select();

  if (assetsError) {
    return apiError("Campaign created but assets could not be saved: " + assetsError.message, 500);
  }

  return NextResponse.json({ campaign, assets, strategy: campaignResult.strategy });
}
