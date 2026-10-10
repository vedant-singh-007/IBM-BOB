import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  tone: z.string().max(200).optional(),
  guidelines: z.string().max(2000).optional(),
  target_audience: z.string().max(500).optional(),
  preferred_vocabulary: z.array(z.string().max(50)).max(30).optional(),
  words_to_avoid: z.array(z.string().max(50)).max(30).optional(),
  example_posts: z.array(z.string().max(2000)).max(5).optional(),
  is_default: z.boolean().optional(),
});

async function ownershipCheck(id: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brand_profiles")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return data;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (error || !data) return apiError("Brand profile not found", 404);
  return NextResponse.json(data);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  const { id } = await params;
  const exists = await ownershipCheck(id, user!.id);
  if (!exists) return apiError("Brand profile not found or access denied", 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body");
  }

  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues.map((i) => i.message).join("; "));

  const supabase = await createClient();

  if (parsed.data.is_default) {
    await supabase
      .from("brand_profiles")
      .update({ is_default: false })
      .eq("user_id", user!.id)
      .neq("id", id);
  }

  const { data, error } = await supabase
    .from("brand_profiles")
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
    .from("brand_profiles")
    .delete()
    .eq("id", id)
    .eq("user_id", user!.id);

  if (error) return apiError(error.message, 500);
  return new NextResponse(null, { status: 204 });
}
