import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z.enum(["draft", "review", "approved", "scheduled", "published"]).optional(),
  name: z.string().min(1).max(200).optional(),
  scheduled_at: z.string().datetime().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (error || !campaign) return apiError("Campaign not found", 404);

  const { data: assets } = await supabase
    .from("content_assets")
    .select("*")
    .eq("campaign_id", id)
    .eq("user_id", user!.id)
    .order("created_at");

  return NextResponse.json({ campaign, assets: assets ?? [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body");
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues.map((i) => i.message).join("; "));

  const supabase = await createClient();

  // Ownership check
  const { data: existing } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!existing) return apiError("Campaign not found or access denied", 403);

  const { data, error } = await supabase
    .from("campaigns")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await params;
  const supabase = await createClient();

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", id)
    .eq("user_id", user!.id);

  if (error) return apiError(error.message, 500);
  return new NextResponse(null, { status: 204 });
}
