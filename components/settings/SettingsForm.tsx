"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

export function SettingsForm({
  initial,
}: {
  initial: {
    warehouse_email: string;
    technician_name: string;
    truck_id: string;
  };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  function patch(p: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...p }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");
      toast("Settings saved", "success");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-4">
      <label>
        <span className="label">Default warehouse email</span>
        <input
          type="email"
          className="input"
          placeholder="warehouse@example.com"
          value={form.warehouse_email}
          onChange={(e) => patch({ warehouse_email: e.target.value })}
        />
        <span className="mt-1 block text-xs text-slate-500">
          Pre-fills the transfer form when sending parts requests.
        </span>
      </label>

      <label>
        <span className="label">Technician name</span>
        <input
          className="input"
          placeholder="e.g. Mike Johnson"
          value={form.technician_name}
          onChange={(e) => patch({ technician_name: e.target.value })}
        />
        <span className="mt-1 block text-xs text-slate-500">
          Pre-fills on every new job.
        </span>
      </label>

      <label>
        <span className="label">Truck ID</span>
        <input
          className="input"
          placeholder="e.g. T-114"
          value={form.truck_id}
          onChange={(e) => patch({ truck_id: e.target.value })}
        />
        <span className="mt-1 block text-xs text-slate-500">
          Pre-fills on every new job.
        </span>
      </label>

      <button onClick={save} disabled={saving} className="btn-gold w-full">
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
