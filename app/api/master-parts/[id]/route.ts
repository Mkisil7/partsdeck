import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { PART_CATEGORIES, type PartCategory } from "@/lib/types";

export const runtime = "nodejs";

// PATCH /api/master-parts/[id] — edit a catalog entry
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: Partial<{
    sku: string | null;
    part_name: string;
    category: PartCategory | null;
    unit: string;
    notes: string | null;
  }>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.sku !== undefined) update.sku = body.sku?.trim() || null;
  if (body.part_name !== undefined) {
    if (!body.part_name.trim()) return jsonError("Part name cannot be empty");
    update.part_name = body.part_name.trim();
  }
  if (body.category !== undefined) {
    if (body.category !== null && !PART_CATEGORIES.includes(body.category)) {
      return jsonError("Invalid category");
    }
    update.category = body.category;
  }
  if (body.unit !== undefined) update.unit = body.unit.trim() || "each";
  if (body.notes !== undefined) update.notes = body.notes?.trim() || null;

  const { error } = await ctx.supabase
    .from("master_parts")
    .update(update)
    .eq("id", params.id);

  if (error) {
    if (error.code === "23505") {
      return jsonError("That SKU or part name is already in the catalog", 409);
    }
    return jsonError(error.message, 500);
  }
  return NextResponse.json({ ok: true });
}

// DELETE /api/master-parts/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;
  const { error } = await ctx.supabase
    .from("master_parts")
    .delete()
    .eq("id", params.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
