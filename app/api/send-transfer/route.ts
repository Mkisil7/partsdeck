import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { getJobWithParts } from "@/lib/queries";
import { sendTransferEmail } from "@/lib/resend";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

  if (!process.env.RESEND_API_KEY) {
    return jsonError("RESEND_API_KEY is not configured", 500);
  }

  let body: { job_id?: string; warehouse_email?: string; requested_by?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (!body.job_id) return jsonError("Missing 'job_id'");
  const warehouseEmail = body.warehouse_email?.trim();
  if (!warehouseEmail) return jsonError("Missing 'warehouse_email'");

  const job = await getJobWithParts(body.job_id);
  if (!job) return jsonError("Job not found", 404);

  const { supabase } = ctx;

  // Record the pending request first so we always have an audit row.
  const { data: transfer, error: insertErr } = await supabase
    .from("transfer_requests")
    .insert({
      job_id: job.id,
      requested_by: body.requested_by?.trim() || job.technician_name || null,
      warehouse_email: warehouseEmail,
      status: "pending",
    })
    .select()
    .single();

  if (insertErr || !transfer) {
    return jsonError(insertErr?.message ?? "Failed to record transfer", 500);
  }

  try {
    await sendTransferEmail({ to: warehouseEmail, job });
  } catch (err) {
    console.error("send-transfer email failed", err);
    return jsonError(
      err instanceof Error ? err.message : "Failed to send email",
      502,
    );
  }

  // Mark the transfer sent and flip the job to 'transferred'.
  await Promise.all([
    supabase
      .from("transfer_requests")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", transfer.id),
    supabase.from("jobs").update({ status: "transferred" }).eq("id", job.id),
  ]);

  return NextResponse.json({ ok: true, transfer_id: transfer.id });
}
