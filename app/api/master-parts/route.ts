import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { PART_CATEGORIES, type PartCategory } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/master-parts — full catalog
export async function GET() {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  const { data, error } = await ctx.supabase
    .from("master_parts")
    .select("*")
    .order("part_name", { ascending: true });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ parts: data ?? [] });
}

// POST /api/master-parts — add one catalog entry
export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: Partial<{
    sku: string;
    part_name: string;
    category: PartCategory | null;
    unit: string;
    notes: string;
  }>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body.part_name?.trim()) return jsonError("Part name is required");
  if (body.category && !PART_CATEGORIES.includes(body.category)) {
    return jsonError("Invalid category");
  }

  const { data, error } = await ctx.supabase
    .from("master_parts")
    .insert({
      sku: body.sku?.trim() || null,
      part_name: body.part_name.trim(),
      category: body.category ?? null,
      unit: body.unit?.trim() || "each",
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError("That SKU or part name is already in the catalog", 409);
    }
    return jsonError(error.message, 500);
  }
  return NextResponse.json({ part: data }, { status: 201 });
}
