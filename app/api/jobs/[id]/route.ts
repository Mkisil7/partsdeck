import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { getJobWithParts } from "@/lib/queries";
import type { JobStatus } from "@/lib/types";

export const runtime = "nodejs";

const VALID_STATUS: JobStatus[] = ["open", "completed", "transferred"];

// GET /api/jobs/[id] — full job with parts
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { error: authError } = await requireUser();
  if (authError) return authError;
  try {
    const job = await getJobWithParts(params.id);
    if (!job) return jsonError("Job not found", 404);
    return NextResponse.json({ job });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed to load job", 500);
  }
}

// PATCH /api/jobs/[id] — update editable job fields (status, notes, etc.)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: Partial<{
    status: JobStatus;
    job_number: string;
    customer_name: string;
    job_date: string;
    notes: string | null;
    technician_name: string | null;
    truck_id: string | null;
  }>;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status)) return jsonError("Invalid status");
    update.status = body.status;
  }
  if (body.job_number !== undefined) {
    if (!body.job_number.trim()) return jsonError("Job number cannot be empty");
    update.job_number = body.job_number.trim();
  }
  if (body.customer_name !== undefined) {
    if (!body.customer_name.trim()) return jsonError("Customer name cannot be empty");
    update.customer_name = body.customer_name.trim();
  }
  if (body.job_date !== undefined) {
    if (!body.job_date) return jsonError("Job date cannot be empty");
    update.job_date = body.job_date;
  }
  if (body.notes !== undefined) update.notes = body.notes;
  if (body.technician_name !== undefined) update.technician_name = body.technician_name;
  if (body.truck_id !== undefined) update.truck_id = body.truck_id;

  if (Object.keys(update).length === 0) return jsonError("No fields to update");

  const { error } = await ctx.supabase
    .from("jobs")
    .update(update)
    .eq("id", params.id);
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}

// DELETE /api/jobs/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;
  const { error } = await ctx.supabase.from("jobs").delete().eq("id", params.id);
  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
