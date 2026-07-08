import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { partMatchKey } from "@/lib/buckets";

export const runtime = "nodejs";

// POST /api/stock-counts — save (upsert) a physical count for one part.
// Body: { part_number?: string | null, part_name: string, counted_qty: number }
export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: {
    part_key?: string;
    part_number?: string | null;
    part_name?: string;
    counted_qty?: number;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const partName = body.part_name?.trim();
  if (!partName) return jsonError("part_name is required");

  const qty = Math.trunc(Number(body.counted_qty));
  if (!Number.isFinite(qty) || qty < 0) {
    return jsonError("counted_qty must be a non-negative number");
  }

  const sku = body.part_number?.trim() || null;
  // Prefer the client's row key so the count lines up with the exact ledger
  // row it was entered against; fall back to deriving it.
  const partKey = body.part_key?.trim() || partMatchKey(sku, partName);

  const { data, error } = await ctx.supabase
    .from("stock_counts")
    .upsert(
      {
        user_id: ctx.userId,
        part_key: partKey,
        sku,
        part_name: partName,
        counted_qty: qty,
        counted_at: new Date().toISOString(),
      },
      { onConflict: "user_id,part_key" },
    )
    .select()
    .single();

  if (error || !data) return jsonError(error?.message ?? "Save failed", 500);
  return NextResponse.json({ count: data });
}

// DELETE /api/stock-counts — clear a saved count. Body: { part_key: string }
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
    .from("stock_counts")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("part_key", partKey);

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
