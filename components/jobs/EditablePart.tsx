"use client";

import { useState } from "react";
import { PART_CATEGORIES, type Part, type PartCategory } from "@/lib/types";

export function EditablePart({
  part,
  busy,
  onSave,
  onDelete,
  onQuantity,
}: {
  part: Part;
  busy: boolean;
  onSave: (patch: Partial<Part>) => void;
  onDelete: () => void;
  onQuantity: (next: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    part_number: part.part_number ?? "",
    part_name: part.part_name,
    unit: part.unit,
    category: (part.category ?? "") as PartCategory | "",
    notes: part.notes ?? "",
  });

  if (editing) {
    return (
      <li className="card space-y-2 py-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="col-span-1">
            <span className="mb-1 block text-xs text-slate-500">SKU / Part #</span>
            <input
              className="input py-2"
              value={draft.part_number}
              onChange={(e) => setDraft({ ...draft, part_number: e.target.value })}
            />
          </label>
          <label className="col-span-1">
            <span className="mb-1 block text-xs text-slate-500">Unit</span>
            <input
              className="input py-2"
              value={draft.unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
            />
          </label>
          <label className="col-span-2">
            <span className="mb-1 block text-xs text-slate-500">Part name</span>
            <input
              className="input py-2"
              value={draft.part_name}
              onChange={(e) => setDraft({ ...draft, part_name: e.target.value })}
            />
          </label>
          <label className="col-span-1">
            <span className="mb-1 block text-xs text-slate-500">Category</span>
            <select
              className="input py-2"
              value={draft.category}
              onChange={(e) =>
                setDraft({ ...draft, category: e.target.value as PartCategory | "" })
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
          <label className="col-span-1">
            <span className="mb-1 block text-xs text-slate-500">Notes</span>
            <input
              className="input py-2"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            className="btn-gold flex-1 py-2 text-sm"
            onClick={() => {
              if (!draft.part_name.trim() && !draft.part_number.trim()) return;
              onSave({
                part_number: draft.part_number.trim() || null,
                part_name: draft.part_name.trim() || draft.part_number.trim(),
                unit: draft.unit.trim() || "each",
                category: draft.category || null,
                notes: draft.notes.trim() || null,
              });
              setEditing(false);
            }}
          >
            Save
          </button>
          <button
            type="button"
            className="btn-ghost py-2 text-sm"
            onClick={() => {
              setDraft({
                part_number: part.part_number ?? "",
                part_name: part.part_name,
                unit: part.unit,
                category: (part.category ?? "") as PartCategory | "",
                notes: part.notes ?? "",
              });
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="card flex items-center justify-between gap-3 py-3">
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
        {part.notes && <p className="text-xs text-slate-400">{part.notes}</p>}
        <div className="mt-1 flex gap-3">
          <button
            type="button"
            className="text-xs text-gold-400 hover:underline"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
          <button
            type="button"
            className="text-xs text-red-300 hover:underline"
            onClick={onDelete}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() => onQuantity(part.quantity - 1)}
          disabled={busy}
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
          onClick={() => onQuantity(part.quantity + 1)}
          disabled={busy}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-navy-600 text-lg text-slate-200"
        >
          +
        </button>
      </div>
    </li>
  );
}
