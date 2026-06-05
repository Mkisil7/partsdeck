import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import type { LineItem } from "@/lib/types";

export const runtime = "nodejs";

interface CreateReceiptBody {
  received_date?: string;
  image_url?: string | null;
  items?: LineItem[];
}

// POST /api/receipts — record an inventory pickup (Wednesday transfer sheet)
export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: CreateReceiptBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body.received_date) return jsonError("Received date is required");

  const items = (body.items ?? []).filter(
    (i) => (i.part_name?.trim() || i.part_number?.trim()) && i.quantity > 0,
  );
  if (items.length === 0) return jsonError("Add at least one received part");

  const { supabase, userId } = ctx;
  const { data, error } = await supabase
    .from("inventory_receipts")
    .insert({
      user_id: userId,
      received_date: body.received_date,
      image_url: body.image_url ?? null,
      items,
    })
    .select("id")
    .single();

  if (error || !data) {
    return jsonError(error?.message ?? "Failed to save receipt", 500);
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
