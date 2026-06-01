import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";

export const runtime = "nodejs";

// POST /api/settings — upsert the signed-in user's settings.
export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: Partial<{
    warehouse_email: string;
    technician_name: string;
    truck_id: string;
  }>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const { error } = await ctx.supabase.from("user_settings").upsert(
    {
      user_id: ctx.userId,
      warehouse_email: body.warehouse_email?.trim() || null,
      technician_name: body.technician_name?.trim() || null,
      truck_id: body.truck_id?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
