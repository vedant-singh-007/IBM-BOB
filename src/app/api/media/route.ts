import { NextRequest, NextResponse } from "next/server";
import { requireAuth, enforceRateLimit, apiError } from "@/lib/api-helpers";
import { describeImage } from "@/lib/ai/service";
import { createClient } from "@/lib/supabase/server";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/utils";
import { z } from "zod";

const MetadataSchema = z.object({
  tags: z.array(z.string().max(100)).max(20).optional(),
  alt_text: z.string().max(500).optional(),
});

// Magic bytes for basic MIME validation (don't trust extension alone)
function validateMagicBytes(buffer: Buffer): string | null {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return "image/gif";
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return "image/webp";
  // SVG starts with XML or <svg
  const head = buffer.slice(0, 100).toString("utf8");
  if (head.includes("<svg") || head.includes("<?xml")) return "image/svg+xml";
  return null;
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  const rateLimitError = enforceRateLimit(user!.id);
  if (rateLimitError) return rateLimitError;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return apiError("Invalid form data");
  }

  const file = formData.get("file") as File | null;
  if (!file) return apiError("No file provided");

  // Size check
  if (file.size > MAX_FILE_SIZE) {
    return apiError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.`);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Magic byte validation
  const detectedMime = validateMagicBytes(buffer);
  if (!detectedMime || !ALLOWED_MIME_TYPES.includes(detectedMime)) {
    return apiError("Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, SVG.");
  }

  const supabase = await createClient();
  const storagePath = `${user!.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(storagePath, buffer, {
      contentType: detectedMime,
      upsert: false,
    });

  if (uploadError) {
    if (uploadError.message.includes("Bucket not found")) {
      return apiError(
        "Storage bucket 'media' not found. Please create a private bucket named 'media' in your Supabase dashboard.",
        503
      );
    }
    return apiError("Upload failed: " + uploadError.message, 500);
  }

  // Try AI description (non-blocking)
  let aiDescription: string | null = null;
  let aiTags: string[] = [];

  const shouldDescribe = formData.get("ai_describe") === "true";
  if (shouldDescribe) {
    try {
      const base64 = buffer.toString("base64");
      const aiResult = await describeImage(base64, detectedMime);
      aiDescription = aiResult.description;
      aiTags = aiResult.tags;
    } catch {
      // Non-fatal: AI description failed, continue without it
    }
  }

  const { data: media, error: dbError } = await supabase
    .from("media_assets")
    .insert({
      user_id: user!.id,
      storage_path: storagePath,
      filename: file.name,
      mime_type: detectedMime,
      size_bytes: file.size,
      ai_description: aiDescription,
      tags: aiTags.length > 0 ? aiTags : null,
    })
    .select()
    .single();

  if (dbError) {
    // Clean up storage upload
    await supabase.storage.from("media").remove([storagePath]);
    return apiError("Database error: " + dbError.message, 500);
  }

  return NextResponse.json(media, { status: 201 });
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("q") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const offset = (page - 1) * limit;

  const supabase = await createClient();
  let query = supabase
    .from("media_assets")
    .select("*", { count: "exact" })
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`filename.ilike.%${search}%,ai_description.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500);

  return NextResponse.json({ items: data ?? [], total: count ?? 0, page, limit });
}
