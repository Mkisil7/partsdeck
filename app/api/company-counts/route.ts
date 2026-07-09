import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { partMatchKey } from "@/lib/buckets";

export const runtime = "nodejs";

// POST /api/company-counts — set what the company thinks you have for a part.
// Body: { part_key?: string, part_number?: string | null, part_name: string,
//         company_qty: number }
export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: {
    part_key?: string;
    part_number?: string | null;
    part_name?: string;
    company_qty?: number;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const partName = body.part_name?.trim();
  if (!partName) return jsonError("part_name is required");

  const qty = Math.trunc(Number(body.company_qty));
  if (!Number.isFinite(qty) || qty < 0) {
    return jsonError("company_qty must be a non-negative number");
  }

  const sku = body.part_number?.trim() || null;
  const partKey = body.part_key?.trim() || partMatchKey(sku, partName);

  const { data, error } = await ctx.supabase
    .from("company_counts")
    .upsert(
      {
        user_id: ctx.userId,
        part_key: partKey,
        sku,
        part_name: partName,
        company_qty: qty,
        set_at: new Date().toISOString(),
      },
      { onConflict: "user_id,part_key" },
    )
    .select()
    .single();

  if (error || !data) return jsonError(error?.message ?? "Save failed", 500);
  return NextResponse.json({ count: data });
}

// DELETE /api/company-counts — revert to the derived ledger figure.
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
    .from("company_counts")
    .delete()
    .eq("user_id", ctx.userId)
    .eq("part_key", partKey);

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
