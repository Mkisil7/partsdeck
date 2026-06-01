// Shared helpers for API route handlers.
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "./supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthedContext {
  supabase: SupabaseClient;
  userId: string;
}

/**
 * Resolve the signed-in user for an API route. Returns either an authed
 * context or a ready-to-return 401 response.
 */
export async function requireUser(): Promise<
  { ctx: AuthedContext; error: null } | { ctx: null; error: NextResponse }
> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ctx: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ctx: { supabase, userId: user.id }, error: null };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
