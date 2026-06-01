// Resend email helpers — builds and sends the warehouse transfer email.
import { Resend } from "resend";
import type { JobWithParts } from "./types";

let client: Resend | null = null;
function getClient(): Resend {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY ?? "");
  }
  return client;
}

const FROM_ADDRESS =
  process.env.RESEND_FROM_EMAIL ?? "PartsDeck <onboarding@resend.dev>";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Clean, mobile-friendly plain HTML transfer email. */
export function buildTransferEmailHtml(job: JobWithParts): string {
  const rows = job.parts
    .map((p) => {
      const sku = p.part_number ? escapeHtml(p.part_number) : "—";
      const notes = p.notes ? escapeHtml(p.notes) : "";
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;color:#0a0f1e;">${sku}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#0a0f1e;">${escapeHtml(p.part_name)}${notes ? `<br><span style="color:#6b7280;font-size:13px;">${notes}</span>` : ""}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#0a0f1e;font-weight:600;">${p.quantity} ${escapeHtml(p.unit)}</td>
        </tr>`;
    })
    .join("");

  const field = (label: string, value: string | null) =>
    value
      ? `<tr><td style="padding:4px 0;color:#6b7280;width:140px;">${label}</td><td style="padding:4px 0;color:#0a0f1e;font-weight:600;">${escapeHtml(value)}</td></tr>`
      : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3f4f6;">
    <div style="max-width:600px;margin:0 auto;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <div style="background:#0a0f1e;border-radius:12px 12px 0 0;padding:20px 24px;">
        <h1 style="margin:0;color:#f0a500;font-size:20px;">PartsDeck Transfer Request</h1>
        <p style="margin:4px 0 0;color:#cbd5e1;font-size:14px;">Job #${escapeHtml(job.job_number)}</p>
      </div>
      <div style="background:#ffffff;padding:24px;border:1px solid #e5e7eb;border-top:none;">
        <table style="width:100%;font-size:14px;border-collapse:collapse;">
          ${field("Customer", job.customer_name)}
          ${field("Date", job.job_date)}
          ${field("Technician", job.technician_name)}
          ${field("Truck ID", job.truck_id)}
        </table>

        <h2 style="font-size:15px;color:#0a0f1e;margin:24px 0 8px;">Parts Requested</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f9fafb;">
              <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase;">SKU</th>
              <th style="padding:10px 12px;text-align:left;color:#6b7280;font-size:12px;text-transform:uppercase;">Part</th>
              <th style="padding:10px 12px;text-align:right;color:#6b7280;font-size:12px;text-transform:uppercase;">Qty</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="3" style="padding:12px;color:#6b7280;">No parts listed.</td></tr>`}</tbody>
        </table>

        ${
          job.notes
            ? `<h2 style="font-size:15px;color:#0a0f1e;margin:24px 0 8px;">Notes</h2><p style="font-size:14px;color:#374151;margin:0;white-space:pre-wrap;">${escapeHtml(job.notes)}</p>`
            : ""
        }
      </div>
      <div style="padding:16px 24px;color:#9ca3af;font-size:12px;text-align:center;">
        Sent via PartsDeck
      </div>
    </div>
  </body>
</html>`;
}

export async function sendTransferEmail(params: {
  to: string;
  job: JobWithParts;
}): Promise<{ id: string | null }> {
  const { to, job } = params;
  const result = await getClient().emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Parts Transfer — Job #${job.job_number} (${job.customer_name})`,
    html: buildTransferEmailHtml(job),
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
  return { id: result.data?.id ?? null };
}
