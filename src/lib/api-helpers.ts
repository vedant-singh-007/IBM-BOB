import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRateLimitHeaders, checkRateLimit } from "@/lib/rate-limit";

/** Get the authenticated user or return a 401 NextResponse */
export async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { user: null, supabase, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, supabase, error: null };
}

/** Enforce rate limit for a user – returns error response if exceeded */
export function enforceRateLimit(userId: string): NextResponse | null {
  const result = checkRateLimit(userId);
  if (!result.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait before making more requests." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          ...getRateLimitHeaders(result),
        },
      }
    );
  }
  return null;
}

/** Safe JSON error response – never leaks stack traces */
export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
