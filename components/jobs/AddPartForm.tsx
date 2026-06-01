"use client";

import { useState } from "react";
import { PART_CATEGORIES, type PartCategory } from "@/lib/types";

export interface NewPartInput {
  part_number: string;
  part_name: string;
  quantity: number;
  unit: string;
  category: PartCategory | null;
  notes: string;
}

export function AddPartForm({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (input: NewPartInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("each");
  const [category, setCategory] = useState<PartCategory | "">("");

  function reset() {
    setSku("");
    setName("");
    setQty("1");
    setUnit("each");
    setCategory("");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost w-full border-dashed text-sm"
      >
        + Add a part
      </button>
    );
  }

  return (
    <div className="card space-y-2 py-3">
      <p className="text-xs text-slate-400">
        Enter a SKU or a name — the catalog fills in the rest.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="input py-2"
          placeholder="SKU / Part #"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />
        <input
          className="input py-2"
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="Qty"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <input
          className="input col-span-2 py-2"
          placeholder="Part name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input py-2"
          placeholder="Unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
        <select
          className="input py-2"
          value={category}
          onChange={(e) => setCategory(e.target.value as PartCategory | "")}
        >
          <option value="">Category —</option>
          {PART_CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-navy-800 capitalize">
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || (!sku.trim() && !name.trim())}
          className="btn-gold flex-1 py-2 text-sm"
          onClick={() => {
            const q = parseInt(qty, 10);
            onAdd({
              part_number: sku.trim(),
              part_name: name.trim(),
              quantity: Number.isNaN(q) || q < 1 ? 1 : q,
              unit: unit.trim() || "each",
              category: category || null,
              notes: "",
            });
            reset();
            setOpen(false);
          }}
        >
          Add
        </button>
        <button
          type="button"
          className="btn-ghost py-2 text-sm"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
