"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import type { JobStatus, JobWithParts, Part } from "@/lib/types";

export function JobDetail({
  job: initialJob,
  defaultWarehouseEmail,
}: {
  job: JobWithParts;
  defaultWarehouseEmail: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [job, setJob] = useState(initialJob);
  const [parts, setParts] = useState<Part[]>(initialJob.parts);
  const [showTransfer, setShowTransfer] = useState(false);
  const [warehouseEmail, setWarehouseEmail] = useState(defaultWarehouseEmail);
  const [sending, setSending] = useState(false);
  const [savingPart, setSavingPart] = useState<string | null>(null);

  async function changeQuantity(part: Part, next: number) {
    const quantity = Math.max(0, next);
    const prev = part.quantity;
    setParts((ps) => ps.map((p) => (p.id === part.id ? { ...p, quantity } : p)));
    setSavingPart(part.id);
    try {
      const res = await fetch(`/api/parts/${part.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Update failed");
    } catch (err) {
      setParts((ps) => ps.map((p) => (p.id === part.id ? { ...p, quantity: prev } : p)));
      toast(err instanceof Error ? err.message : "Could not update", "error");
    } finally {
      setSavingPart(null);
    }
  }

  async function setStatus(status: JobStatus) {
    const prev = job.status;
    setJob((j) => ({ ...j, status }));
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Update failed");
      toast(`Marked ${status}`, "success");
      router.refresh();
    } catch (err) {
      setJob((j) => ({ ...j, status: prev }));
      toast(err instanceof Error ? err.message : "Could not update", "error");
    }
  }

  async function sendTransfer() {
    if (!warehouseEmail.trim()) return toast("Enter a warehouse email", "error");
    setSending(true);
    try {
      const res = await fetch("/api/send-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id, warehouse_email: warehouseEmail.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed");
      toast("Transfer sent to warehouse", "success");
      setShowTransfer(false);
      setJob((j) => ({ ...j, status: "transferred" }));
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send", "error");
    } finally {
      setSending(false);
    }
  }

  async function deleteJob() {
    if (!confirm("Delete this job and all its parts?")) return;
    try {
      const res = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
      toast("Job deleted", "success");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not delete", "error");
    }
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">#{job.job_number}</h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-slate-300">{job.customer_name}</p>
          </div>
          <span className="text-sm text-slate-400">{formatDate(job.job_date)}</span>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          {job.technician_name && (
            <div>
              <dt className="text-slate-500">Technician</dt>
              <dd className="text-slate-200">{job.technician_name}</dd>
            </div>
          )}
          {job.truck_id && (
            <div>
              <dt className="text-slate-500">Truck</dt>
              <dd className="text-slate-200">{job.truck_id}</dd>
            </div>
          )}
        </dl>

        {job.notes && (
          <p className="whitespace-pre-wrap rounded-lg bg-navy-700/50 p-3 text-sm text-slate-300">
            {job.notes}
          </p>
        )}

        {job.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={job.image_url}
            alt="Job sheet"
            className="w-full rounded-lg border border-navy-600"
          />
        )}
      </div>

      {/* Parts */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Parts ({parts.length})
        </h2>
        <ul className="space-y-2">
          {parts.map((part) => (
            <li
              key={part.id}
              className="card flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-100">{part.part_name}</p>
                <p className="text-xs text-slate-500">
                  {part.part_number ? (
                    <span className="font-mono">{part.part_number}</span>
                  ) : (
                    "no SKU"
                  )}
                  {part.category ? ` · ${part.category}` : ""}
                </p>
                {part.notes && (
                  <p className="text-xs text-slate-400">{part.notes}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  onClick={() => changeQuantity(part, part.quantity - 1)}
                  disabled={savingPart === part.id}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy-600 text-lg text-slate-200"
                >
                  −
                </button>
                <span className="w-12 text-center text-sm tabular-nums text-slate-100">
                  {part.quantity}
                  <span className="block text-[10px] text-slate-500">{part.unit}</span>
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  onClick={() => changeQuantity(part, part.quantity + 1)}
                  disabled={savingPart === part.id}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy-600 text-lg text-slate-200"
                >
                  +
                </button>
              </div>
            </li>
          ))}
          {parts.length === 0 && (
            <li className="card text-sm text-slate-400">No parts on this job.</li>
          )}
        </ul>
      </div>

      {/* Transfer panel */}
      {showTransfer ? (
        <div className="card space-y-3 animate-fade-in">
          <h3 className="font-semibold text-slate-100">Send to Warehouse</h3>
          <label>
            <span className="label">Warehouse email</span>
            <input
              type="email"
              className="input"
              value={warehouseEmail}
              onChange={(e) => setWarehouseEmail(e.target.value)}
              placeholder="warehouse@example.com"
            />
          </label>
          <p className="text-xs text-slate-500">
            Sends a formatted parts list and marks this job as transferred.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={sendTransfer}
              disabled={sending}
              className="btn-gold flex-1"
            >
              {sending ? "Sending…" : "Send email"}
            </button>
            <button
              type="button"
              onClick={() => setShowTransfer(false)}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowTransfer(true)}
          className="btn-gold w-full"
        >
          Send to Warehouse
        </button>
      )}

      {/* Status actions */}
      <div className="flex flex-wrap gap-2">
        {job.status !== "completed" && (
          <button
            type="button"
            onClick={() => setStatus("completed")}
            className="btn-ghost flex-1"
          >
            Mark completed
          </button>
        )}
        {job.status !== "open" && (
          <button
            type="button"
            onClick={() => setStatus("open")}
            className="btn-ghost flex-1"
          >
            Reopen
          </button>
        )}
        <button type="button" onClick={deleteJob} className="btn-danger flex-1">
          Delete
        </button>
      </div>
    </div>
  );
}
