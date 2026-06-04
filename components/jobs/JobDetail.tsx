"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EditablePart } from "./EditablePart";
import { AddPartForm, type NewPartInput } from "./AddPartForm";
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
  const [busyPart, setBusyPart] = useState(false);

  // Header edit
  const [editingHeader, setEditingHeader] = useState(false);
  const [header, setHeader] = useState({
    job_number: job.job_number,
    customer_name: job.customer_name,
    job_date: job.job_date,
    technician_name: job.technician_name ?? "",
    truck_id: job.truck_id ?? "",
    notes: job.notes ?? "",
  });
  const [savingHeader, setSavingHeader] = useState(false);

  // -- Parts: refresh from server (used after add/merge) -------------------
  async function refreshParts() {
    const res = await fetch(`/api/jobs/${job.id}`);
    if (res.ok) {
      const json = await res.json();
      setParts(json.job.parts as Part[]);
    }
  }

  async function changeQuantity(part: Part, next: number) {
    const quantity = Math.max(0, next);
    const prev = part.quantity;
    setParts((ps) => ps.map((p) => (p.id === part.id ? { ...p, quantity } : p)));
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
    }
  }

  async function savePart(part: Part, patch: Partial<Part>) {
    setParts((ps) => ps.map((p) => (p.id === part.id ? { ...p, ...patch } : p)));
    setBusyPart(true);
    try {
      const res = await fetch(`/api/parts/${part.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Update failed");
      toast("Part updated", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update", "error");
      refreshParts();
    } finally {
      setBusyPart(false);
    }
  }

  async function deletePart(part: Part) {
    if (!confirm(`Remove ${part.part_name}?`)) return;
    const snapshot = parts;
    setParts((ps) => ps.filter((p) => p.id !== part.id));
    setBusyPart(true);
    try {
      const res = await fetch(`/api/parts/${part.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
    } catch (err) {
      setParts(snapshot);
      toast(err instanceof Error ? err.message : "Could not delete", "error");
    } finally {
      setBusyPart(false);
    }
  }

  async function addPart(input: NewPartInput) {
    setBusyPart(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Add failed");
      await refreshParts();
      toast(json.merged ? "Merged into existing part" : "Part added", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not add part", "error");
    } finally {
      setBusyPart(false);
    }
  }

  async function saveHeader() {
    if (!header.job_number.trim()) return toast("Job number is required", "error");
    if (!header.customer_name.trim()) return toast("Customer is required", "error");
    setSavingHeader(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_number: header.job_number,
          customer_name: header.customer_name,
          job_date: header.job_date,
          technician_name: header.technician_name || null,
          truck_id: header.truck_id || null,
          notes: header.notes || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Update failed");
      setJob((j) => ({
        ...j,
        job_number: header.job_number.trim(),
        customer_name: header.customer_name.trim(),
        job_date: header.job_date,
        technician_name: header.technician_name || null,
        truck_id: header.truck_id || null,
        notes: header.notes || null,
      }));
      setEditingHeader(false);
      toast("Job updated", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not update", "error");
    } finally {
      setSavingHeader(false);
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
      {/* Header */}
      <div className="card space-y-3">
        {editingHeader ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <label className="col-span-1">
                <span className="mb-1 block text-xs text-slate-500">Job #</span>
                <input
                  className="input py-2"
                  value={header.job_number}
                  onChange={(e) => setHeader({ ...header, job_number: e.target.value })}
                />
              </label>
              <label className="col-span-1">
                <span className="mb-1 block text-xs text-slate-500">Date</span>
                <input
                  type="date"
                  className="input py-2"
                  value={header.job_date}
                  onChange={(e) => setHeader({ ...header, job_date: e.target.value })}
                />
              </label>
              <label className="col-span-2">
                <span className="mb-1 block text-xs text-slate-500">Customer</span>
                <input
                  className="input py-2"
                  value={header.customer_name}
                  onChange={(e) =>
                    setHeader({ ...header, customer_name: e.target.value })
                  }
                />
              </label>
              <label className="col-span-1">
                <span className="mb-1 block text-xs text-slate-500">Technician</span>
                <input
                  className="input py-2"
                  value={header.technician_name}
                  onChange={(e) =>
                    setHeader({ ...header, technician_name: e.target.value })
                  }
                />
              </label>
              <label className="col-span-1">
                <span className="mb-1 block text-xs text-slate-500">Truck ID</span>
                <input
                  className="input py-2"
                  value={header.truck_id}
                  onChange={(e) => setHeader({ ...header, truck_id: e.target.value })}
                />
              </label>
              <label className="col-span-2">
                <span className="mb-1 block text-xs text-slate-500">Notes</span>
                <textarea
                  className="input min-h-[60px] py-2"
                  value={header.notes}
                  onChange={(e) => setHeader({ ...header, notes: e.target.value })}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveHeader}
                disabled={savingHeader}
                className="btn-gold flex-1 py-2 text-sm"
              >
                {savingHeader ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn-ghost py-2 text-sm"
                onClick={() => {
                  setHeader({
                    job_number: job.job_number,
                    customer_name: job.customer_name,
                    job_date: job.job_date,
                    technician_name: job.technician_name ?? "",
                    truck_id: job.truck_id ?? "",
                    notes: job.notes ?? "",
                  });
                  setEditingHeader(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-100">
                    #{job.job_number}
                  </h1>
                  <StatusBadge status={job.status} />
                </div>
                <p className="text-slate-300">{job.customer_name}</p>
              </div>
              <div className="text-right">
                <span className="block text-sm text-slate-400">
                  {formatDate(job.job_date)}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingHeader(true)}
                  className="mt-1 text-xs text-gold-400 hover:underline"
                >
                  Edit
                </button>
              </div>
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
          </>
        )}
      </div>

      {/* Parts */}
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Parts ({parts.length})
        </h2>
        <ul className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2">
          {parts.map((part) => (
            <EditablePart
              key={part.id}
              part={part}
              busy={busyPart}
              onQuantity={(next) => changeQuantity(part, next)}
              onSave={(patch) => savePart(part, patch)}
              onDelete={() => deletePart(part)}
            />
          ))}
          {parts.length === 0 && (
            <li className="card text-sm text-slate-400 sm:col-span-2">No parts on this job yet.</li>
          )}
        </ul>
        <div className="mt-2">
          <AddPartForm busy={busyPart} onAdd={addPart} />
        </div>
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

      <button type="button" onClick={deleteJob} className="btn-danger">
        Delete
      </button>
    </div>
  );
}
