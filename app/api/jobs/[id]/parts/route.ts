import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { enrichParsedParts, partKey } from "@/lib/master";
import { PART_CATEGORIES, type Part, type PartCategory } from "@/lib/types";

export const runtime = "nodejs";

// POST /api/jobs/[id]/parts — add a part. Auto-fills the missing SKU/name from
// the master catalog and merges into an existing row if it's a duplicate.
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: Partial<{
    part_number: string;
    part_name: string;
    quantity: number;
    unit: string;
    category: PartCategory | null;
    notes: string;
  }>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body.part_name?.trim() && !body.part_number?.trim()) {
    return jsonError("A part needs a name or a SKU");
  }
  if (body.category && !PART_CATEGORIES.includes(body.category)) {
    return jsonError("Invalid category");
  }

  const { supabase } = ctx;

  // Confirm the job exists/owned (RLS enforces ownership on the select).
  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();
  if (!job) return jsonError("Job not found", 404);

  // Auto-fill the missing side from the master catalog.
  const [enriched] = await enrichParsedParts(supabase, [
    {
      part_number: body.part_number?.trim() || null,
      part_name: body.part_name?.trim() || null,
      quantity: body.quantity ?? 1,
      unit: body.unit?.trim() || null,
      category: body.category ?? null,
      notes: body.notes?.trim() || null,
    },
  ]);

  const qty =
    typeof body.quantity === "number" && body.quantity > 0
      ? Math.floor(body.quantity)
      : 1;
  const newKey = partKey(enriched);

  // Merge with an existing duplicate on the same job if present.
  const { data: existingParts } = await supabase
    .from("parts")
    .select("*")
    .eq("job_id", params.id);

  const dup = (existingParts ?? []).find(
    (p: Part) => partKey(p) === newKey,
  ) as Part | undefined;

  if (dup) {
    const { error } = await supabase
      .from("parts")
      .update({ quantity: dup.quantity + qty })
      .eq("id", dup.id);
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ ok: true, merged: true, part_id: dup.id });
  }

  const { data: inserted, error } = await supabase
    .from("parts")
    .insert({
      job_id: params.id,
      part_number: enriched.part_number,
      part_name: enriched.part_name || enriched.part_number || "Unknown part",
      quantity: qty,
      unit: enriched.unit || "each",
      category: enriched.category,
      notes: enriched.notes,
    })
    .select()
    .single();
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true, merged: false, part: inserted }, { status: 201 });
}
