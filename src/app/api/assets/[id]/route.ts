import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(50000).optional(),
  status: z.enum(["draft", "review", "approved", "scheduled", "published"]).optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  note: z.string().max(500).optional(),
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

  const [{ data: asset }, { data: revisions }, { data: reviews }] = await Promise.all([
    supabase.from("content_assets").select("*").eq("id", id).eq("user_id", user!.id).single(),
    supabase.from("content_revisions").select("*").eq("asset_id", id).eq("user_id", user!.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("critic_reviews").select("*").eq("asset_id", id).eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
  ]);

  if (!asset) return apiError("Asset not found", 404);
  return NextResponse.json({ asset, revisions: revisions ?? [], reviews: reviews ?? [] });
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
    .from("content_assets")
    .select("content")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();
  if (!existing) return apiError("Asset not found or access denied", 403);

  const { content, note, ...updateFields } = parsed.data;

  // Save revision if content changed
  if (content && content !== existing.content) {
    await supabase.from("content_revisions").insert({
      asset_id: id,
      user_id: user!.id,
      content: existing.content,
      note: note ?? "Manual edit",
    });
    const wc = content.split(/\s+/).length;
    Object.assign(updateFields, { content, word_count: wc });
  }

  const { data, error } = await supabase
    .from("content_assets")
    .update(updateFields)
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
    .from("content_assets")
    .delete()
    .eq("id", id)
    .eq("user_id", user!.id);

  if (error) return apiError(error.message, 500);
  return new NextResponse(null, { status: 204 });
}
