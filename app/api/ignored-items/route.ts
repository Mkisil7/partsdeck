import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export const runtime = "nodejs";

// GET /api/ignored-items — the full shared ignore list
export async function GET() {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  const { data, error } = await ctx.supabase
    .from("ignored_items")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ items: data ?? [] });
}

// POST /api/ignored-items — add a line to ignore (needs SKU and/or name)
export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: Partial<{ sku: string; part_name: string }>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const sku = body.sku?.trim() || null;
  const part_name = body.part_name?.trim() || null;
  if (!sku && !part_name) return jsonError("Enter a SKU or a name to ignore");

  const { data, error } = await ctx.supabase
    .from("ignored_items")
    .insert({ sku, part_name })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError("That SKU or name is already on the ignore list", 409);
    }
    return jsonError(error.message, 500);
  }
  return NextResponse.json({ item: data }, { status: 201 });
}
