"use client";

import { useState } from "react";
import { PartSearchInput } from "@/components/parts/PartSearchInput";
import { useToast } from "@/components/ui/Toast";
import { partMatchKey } from "@/lib/buckets";
import type { CatalogEntry } from "@/lib/master";
import type { PartMinLevel } from "@/lib/types";

interface Row {
  part_key: string;
  sku: string | null;
  part_name: string;
  min_quantity: number;
}

export function MinLevelsManager({
  catalog,
  initial,
}: {
  catalog: CatalogEntry[];
  initial: PartMinLevel[];
}) {
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>(
    initial.map((m) => ({
      part_key: m.part_key,
      sku: m.sku,
      part_name: m.part_name,
      min_quantity: m.min_quantity,
    })),
  );

  async function persist(row: Row) {
    const res = await fetch("/api/min-levels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        part_number: row.sku,
        part_name: row.part_name,
        min_quantity: row.min_quantity,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || "Save failed");
    }
  }

  async function addPart(entry: CatalogEntry) {
    const key = partMatchKey(entry.sku, entry.part_name);
    if (rows.some((r) => r.part_key === key)) {
      toast("That part already has a minimum set", "error");
      return;
    }
    const row: Row = {
      part_key: key,
      sku: entry.sku,
      part_name: entry.part_name,
      min_quantity: 1,
    };
    setRows((prev) => [...prev, row]);
    try {
      await persist(row);
      toast("Minimum added", "success");
    } catch (err) {
      setRows((prev) => prev.filter((r) => r.part_key !== key));
      toast(err instanceof Error ? err.message : "Could not save", "error");
    }
  }

  function setMin(key: string, value: number) {
    setRows((prev) =>
      prev.map((r) =>
        r.part_key === key ? { ...r, min_quantity: Math.max(0, value) } : r,
      ),
    );
  }

  async function saveMin(key: string) {
    const row = rows.find((r) => r.part_key === key);
    if (!row) return;
    try {
      await persist(row);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save", "error");
    }
  }

  async function remove(key: string) {
    const prev = rows;
    setRows((r) => r.filter((x) => x.part_key !== key));
    try {
      const res = await fetch("/api/min-levels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part_key: key }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
    } catch (err) {
      setRows(prev);
      toast(err instanceof Error ? err.message : "Could not remove", "error");
    }
  }

  return (
    <div className="card mt-4 space-y-4">
      <div>
        <p className="font-semibold text-slate-100">Low-stock alerts</p>
        <p className="text-sm text-slate-400">
          Set a minimum you want to keep on hand for each part. When your count
          drops to or below it, you’ll get flagged on the dashboard.
        </p>
      </div>

      <PartSearchInput catalog={catalog} onPick={addPart} placeholder="Add a part to watch…" />

      {rows.length > 0 ? (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.part_key}
              className="flex items-center justify-between gap-3 rounded-xl border border-navy-600 bg-navy-700/40 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-100">{row.part_name}</p>
                {row.sku && (
                  <p className="font-mono text-xs text-slate-500">{row.sku}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-slate-400">min</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  className="input w-16 py-1.5 text-center"
                  value={row.min_quantity}
                  onChange={(e) =>
                    setMin(row.part_key, parseInt(e.target.value, 10) || 0)
                  }
                  onBlur={() => saveMin(row.part_key)}
                />
                <button
                  type="button"
                  onClick={() => remove(row.part_key)}
                  className="text-xs text-red-300 hover:text-red-200"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">
          No alerts yet. Search for a part above to set its minimum.
        </p>
      )}
    </div>
  );
}
