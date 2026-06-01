import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export const runtime = "nodejs";

// DELETE /api/ignored-items/[id] — stop ignoring a line
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  const { error } = await ctx.supabase
    .from("ignored_items")
    .delete()
    .eq("id", params.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
