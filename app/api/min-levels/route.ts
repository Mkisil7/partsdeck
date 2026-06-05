import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { partMatchKey } from "@/lib/buckets";

export const runtime = "nodejs";

// POST /api/min-levels — upsert a single part's minimum stock level.
// Body: { part_number?: string | null, part_name: string, min_quantity: number }
export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: {
    part_number?: string | null;
    part_name?: string;
    min_quantity?: number;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const partName = body.part_name?.trim();
  if (!partName) return jsonError("part_name is required");

  const min = Math.trunc(Number(body.min_quantity));
  if (!Number.isFinite(min) || min < 0) {
    return jsonError("min_quantity must be a non-negative number");
  }

  const sku = body.part_number?.trim() || null;
  const partKey = partMatchKey(sku, partName);

  const { error } = await ctx.supabase.from("part_min_levels").upsert(
    {
      user_id: ctx.userId,
      part_key: partKey,
      sku,
      part_name: partName,
      min_quantity: min,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,part_key" },
  );

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

// DELETE /api/min-levels — remove a threshold. Body: { part_key: string }
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
    .from("part_min_levels")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("part_key", partKey);

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
