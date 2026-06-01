"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { IgnoredItem } from "@/lib/types";

export function IgnoreListManager({ initial }: { initial: IgnoredItem[] }) {
  const { toast } = useToast();
  const [items, setItems] = useState<IgnoredItem[]>(initial);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  async function addItem() {
    if (!sku.trim() && !name.trim()) {
      toast("Enter a SKU or a name", "error");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/ignored-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku: sku.trim(), part_name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Add failed");
      setItems((xs) => [...xs, json.item as IgnoredItem]);
      setSku("");
      setName("");
      toast("Added to ignore list", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not add", "error");
    } finally {
      setAdding(false);
    }
  }

  async function removeItem(item: IgnoredItem) {
    const snapshot = items;
    setItems((xs) => xs.filter((x) => x.id !== item.id));
    try {
      const res = await fetch(`/api/ignored-items/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
    } catch (err) {
      setItems(snapshot);
      toast(err instanceof Error ? err.message : "Could not remove", "error");
    }
  }

  return (
    <div className="space-y-3">
      <div className="card space-y-2">
        <h2 className="text-sm font-semibold text-slate-200">Add an item to ignore</h2>
        <p className="text-xs text-slate-500">
          Lines matching one of these (by SKU or name) are dropped automatically
          when a work order is scanned — fees, permits, signs, stickers, etc.
        </p>
        <div className="space-y-2">
          <input
            className="input py-2"
            placeholder="SKU / item code"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <input
            className="input py-2"
            placeholder="Item name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={addItem}
          disabled={adding}
          className="btn-gold w-full py-2 text-sm"
        >
          {adding ? "Adding…" : "Add to ignore list"}
        </button>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="card flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-100">
                {item.part_name || item.sku}
              </p>
              {item.sku && item.part_name && (
                <p className="text-xs text-slate-500 font-mono">{item.sku}</p>
              )}
            </div>
            <button
              type="button"
              className="shrink-0 text-xs text-red-300 hover:underline"
              onClick={() => removeItem(item)}
            >
              Remove
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="card text-sm text-slate-400">
            Nothing ignored yet. Add the fees and accessories you don&apos;t track.
          </li>
        )}
      </ul>
    </div>
  );
}
