import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UpdateSchema = z.object({
  tags: z.array(z.string().max(100)).max(20).optional(),
  alt_text: z.string().max(500).optional(),
  ai_description: z.string().max(1000).optional(),
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

  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (error || !data) return apiError("Media asset not found", 404);

  // Generate a short-lived signed URL for private storage
  const { data: signedUrl } = await supabase.storage
    .from("media")
    .createSignedUrl(data.storage_path, 60 * 60); // 1 hour

  return NextResponse.json({ ...data, url: signedUrl?.signedUrl ?? null });
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

  const { data, error } = await supabase
    .from("media_assets")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user!.id)
    .select()
    .single();

  if (error || !data) return apiError(error?.message ?? "Not found", error ? 500 : 404);
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

  const { data } = await supabase
    .from("media_assets")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!data) return apiError("Media asset not found", 404);

  // Delete from storage
  await supabase.storage.from("media").remove([data.storage_path]);

  // Delete from DB
  const { error } = await supabase
    .from("media_assets")
    .delete()
    .eq("id", id)
    .eq("user_id", user!.id);

  if (error) return apiError(error.message, 500);
  return new NextResponse(null, { status: 204 });
}
