import { NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError } from "@/lib/api-helpers";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const BrandSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  tone: z.string().max(200).optional(),
  guidelines: z.string().max(2000).optional(),
  target_audience: z.string().max(500).optional(),
  preferred_vocabulary: z.array(z.string().max(50)).max(30).optional(),
  words_to_avoid: z.array(z.string().max(50)).max(30).optional(),
  example_posts: z.array(z.string().max(2000)).max(5).optional(),
  is_default: z.boolean().optional(),
});

export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("user_id", user!.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return apiError(error.message, 500);
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body");
  }

  const parsed = BrandSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues.map((i) => i.message).join("; "));

  const supabase = await createClient();

  // If new default, unset others
  if (parsed.data.is_default) {
    await supabase
      .from("brand_profiles")
      .update({ is_default: false })
      .eq("user_id", user!.id);
  }

  const { data, error } = await supabase
    .from("brand_profiles")
    .insert({ ...parsed.data, user_id: user!.id })
    .select()
    .single();

  if (error) return apiError(error.message, 500);
  return NextResponse.json(data, { status: 201 });
}
