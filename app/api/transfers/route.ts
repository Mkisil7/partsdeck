import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import type { LineItem } from "@/lib/types";

export const runtime = "nodejs";

interface CreateTransferBody {
  recipient_name?: string;
  recipient_email?: string | null;
  message?: string | null;
  items?: LineItem[];
}

// POST /api/transfers — log a tech-to-tech transfer
export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: CreateTransferBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const recipient = body.recipient_name?.trim();
  if (!recipient) return jsonError("Recipient name is required");

  const items = (body.items ?? []).filter(
    (i) => (i.part_name?.trim() || i.part_number?.trim()) && i.quantity > 0,
  );
  if (items.length === 0) return jsonError("Add at least one part to transfer");

  const { supabase, userId } = ctx;
  const { data, error } = await supabase
    .from("transfers")
    .insert({
      user_id: userId,
      recipient_name: recipient,
      recipient_email: body.recipient_email?.trim() || null,
      message: body.message?.trim() || null,
      items,
    })
    .select("id")
    .single();

  if (error || !data) {
    return jsonError(error?.message ?? "Failed to save transfer", 500);
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}
