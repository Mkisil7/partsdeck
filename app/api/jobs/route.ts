import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { getJobsWithCounts } from "@/lib/queries";
import { dedupePartDrafts } from "@/lib/draft";
import type { JobDraft, ParsedJob } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/jobs — jobs with parts count
export async function GET() {
  const { error: authError } = await requireUser();
  if (authError) return authError;
  try {
    const jobs = await getJobsWithCounts();
    return NextResponse.json({ jobs });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed to load jobs", 500);
  }
}

interface CreateJobBody {
  draft: JobDraft;
  image_url?: string | null;
  parsed_data?: ParsedJob | null;
}

// POST /api/jobs — create job + its parts
export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  let body: CreateJobBody;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  const draft = body.draft;
  if (!draft?.job_number?.trim()) return jsonError("Job number is required");
  if (!draft.customer_name?.trim()) return jsonError("Customer name is required");
  if (!draft.job_date) return jsonError("Job date is required");

  const { supabase, userId } = ctx;

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      job_number: draft.job_number.trim(),
      customer_name: draft.customer_name.trim(),
      job_date: draft.job_date,
      technician_name: draft.technician_name?.trim() || null,
      truck_id: draft.truck_id?.trim() || null,
      notes: draft.notes?.trim() || null,
      image_url: body.image_url ?? null,
      parsed_data: body.parsed_data ?? null,
    })
    .select()
    .single();

  if (jobError || !job) {
    return jsonError(jobError?.message ?? "Failed to create job", 500);
  }

  const partRows = dedupePartDrafts(draft.parts ?? [])
    .map((p) => {
      const qty = parseInt(p.quantity, 10);
      return {
        job_id: job.id,
        part_number: p.part_number.trim() || null,
        part_name: p.part_name.trim() || p.part_number.trim(),
        quantity: Number.isNaN(qty) || qty < 1 ? 1 : qty,
        unit: p.unit.trim() || "each",
        category: p.category || null,
        notes: p.notes.trim() || null,
      };
    });

  if (partRows.length > 0) {
    const { error: partsError } = await supabase.from("parts").insert(partRows);
    if (partsError) {
      // Roll back the job so we don't leave an orphan.
      await supabase.from("jobs").delete().eq("id", job.id);
      return jsonError(partsError.message, 500);
    }
  }

  return NextResponse.json({ id: job.id }, { status: 201 });
}
