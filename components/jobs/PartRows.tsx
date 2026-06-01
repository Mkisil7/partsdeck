"use client";

import { PART_CATEGORIES, type PartDraft, type PartCategory } from "@/lib/types";
import { emptyPartDraft } from "@/lib/draft";

export function PartRows({
  parts,
  onChange,
}: {
  parts: PartDraft[];
  onChange: (parts: PartDraft[]) => void;
}) {
  function update(index: number, patch: Partial<PartDraft>) {
    onChange(parts.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }
  function remove(index: number) {
    onChange(parts.filter((_, i) => i !== index));
  }
  function add() {
    onChange([...parts, emptyPartDraft()]);
  }

  return (
    <div className="space-y-3">
      {parts.map((part, i) => (
        <div key={i} className="rounded-xl border border-navy-600 bg-navy-700/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              Part {i + 1}
            </span>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-xs text-red-300 hover:text-red-200"
              aria-label={`Remove part ${i + 1}`}
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-1">
              <span className="mb-1 block text-xs text-slate-500">SKU / Part #</span>
              <input
                className="input py-2"
                placeholder="e.g. BR-4471"
                value={part.part_number}
                onChange={(e) => update(i, { part_number: e.target.value })}
              />
            </label>
            <label className="col-span-1">
              <span className="mb-1 block text-xs text-slate-500">Quantity</span>
              <input
                className="input py-2"
                type="number"
                min={1}
                inputMode="numeric"
                value={part.quantity}
                onChange={(e) => update(i, { quantity: e.target.value })}
              />
            </label>
            <label className="col-span-2">
              <span className="mb-1 block text-xs text-slate-500">Part name</span>
              <input
                className="input py-2"
                placeholder="e.g. Brake pads"
                value={part.part_name}
                onChange={(e) => update(i, { part_name: e.target.value })}
              />
            </label>
            <label className="col-span-1">
              <span className="mb-1 block text-xs text-slate-500">Unit</span>
              <input
                className="input py-2"
                placeholder="each"
                value={part.unit}
                onChange={(e) => update(i, { unit: e.target.value })}
              />
            </label>
            <label className="col-span-1">
              <span className="mb-1 block text-xs text-slate-500">Category</span>
              <select
                className="input py-2"
                value={part.category}
                onChange={(e) =>
                  update(i, { category: e.target.value as PartCategory | "" })
                }
              >
                <option value="">—</option>
                {PART_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-navy-800 capitalize">
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="col-span-2">
              <span className="mb-1 block text-xs text-slate-500">Notes</span>
              <input
                className="input py-2"
                value={part.notes}
                onChange={(e) => update(i, { notes: e.target.value })}
              />
            </label>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="btn-ghost w-full border-dashed text-sm"
      >
        + Add another part
      </button>
    </div>
  );
}
