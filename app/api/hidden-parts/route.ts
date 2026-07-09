import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { partMatchKey } from "@/lib/buckets";

export const runtime = "nodejs";

// POST /api/hidden-parts — remove a part from the On Hand list.
// Body: { part_key?: string, part_number?: string | null, part_name: string }
export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: {
    part_key?: string;
    part_number?: string | null;
    part_name?: string;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const partName = body.part_name?.trim();
  if (!partName) return jsonError("part_name is required");

  const sku = body.part_number?.trim() || null;
  const partKey = body.part_key?.trim() || partMatchKey(sku, partName);

  const { data, error } = await ctx.supabase
    .from("hidden_parts")
    .upsert(
      { user_id: ctx.userId, part_key: partKey, sku, part_name: partName },
      { onConflict: "user_id,part_key" },
    )
    .select()
    .single();

  if (error || !data) return jsonError(error?.message ?? "Save failed", 500);
  return NextResponse.json({ hidden: data });
}

// DELETE /api/hidden-parts — put a part back on the list.
// Body: { part_key: string }
export async function DELETE(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: { part_key?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
  const partKey = body.part_key?.trim();
  if (!partKey) return jsonError("part_key is required");

  const { error } = await ctx.supabase
    .from("hidden_parts")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("part_key", partKey);

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
