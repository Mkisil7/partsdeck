import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/api";
import { getJobWithParts } from "@/lib/queries";
import { buildTransferEmailHtml } from "@/lib/resend";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { ctx, error: authError } = await requireUser();
  if (authError) return authError;

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

  // Create a draft transfer request (status = pending, not sent).
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
    return jsonError(insertErr?.message ?? "Failed to create draft", 500);
  }

  // Generate the email HTML draft (no send).
  const emailHtml = buildTransferEmailHtml(job);
  const emailSubject = `Parts Transfer — Job #${job.job_number} (${job.customer_name})`;

  return NextResponse.json({
    ok: true,
    transfer_id: transfer.id,
    draft: { emailSubject, emailHtml, to: warehouseEmail },
  });
}
