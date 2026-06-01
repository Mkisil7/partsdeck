import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { PART_CATEGORIES, type PartCategory } from "@/lib/types";

export const runtime = "nodejs";

// PATCH /api/parts/[id] — edit quantity / fields. RLS ensures ownership.
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: Partial<{
    quantity: number;
    part_name: string;
    part_number: string | null;
    unit: string;
    category: PartCategory | null;
    notes: string | null;
  }>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const update: Record<string, unknown> = {};
  if (body.quantity !== undefined) {
    const q = Number(body.quantity);
    if (!Number.isFinite(q) || q < 0) return jsonError("Invalid quantity");
    update.quantity = Math.floor(q);
  }
  if (body.part_name !== undefined) {
    if (!body.part_name.trim()) return jsonError("Part name cannot be empty");
    update.part_name = body.part_name.trim();
  }
  if (body.part_number !== undefined)
    update.part_number = body.part_number?.trim() || null;
  if (body.unit !== undefined) update.unit = body.unit.trim() || "each";
  if (body.category !== undefined) {
    if (body.category !== null && !PART_CATEGORIES.includes(body.category))
      return jsonError("Invalid category");
    update.category = body.category;
  }
  if (body.notes !== undefined) update.notes = body.notes?.trim() || null;

  if (Object.keys(update).length === 0) return jsonError("No fields to update");

  const { error } = await ctx.supabase
    .from("parts")
    .update(update)
    .eq("id", params.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

// DELETE /api/parts/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;
  const { error } = await ctx.supabase.from("parts").delete().eq("id", params.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
