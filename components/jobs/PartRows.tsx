"use client";

import { useMemo } from "react";
import type { PartDraft } from "@/lib/types";
import { emptyPartDraft } from "@/lib/draft";
import { redlineFor, type BaselineEntry } from "@/lib/redline";
import {
  buildCatalogIndex,
  lookupBySku,
  lookupByName,
  type CatalogEntry,
} from "@/lib/master";

export function PartRows({
  parts,
  onChange,
  catalog = [],
  baseline,
}: {
  parts: PartDraft[];
  onChange: (parts: PartDraft[]) => void;
  catalog?: CatalogEntry[];
  /** Original ticket contents — rows that differ get redlined. */
  baseline?: Map<string, BaselineEntry>;
}) {
  const index = useMemo(() => buildCatalogIndex(catalog), [catalog]);

  function update(i: number, patch: Partial<PartDraft>) {
    onChange(parts.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function remove(i: number) {
    onChange(parts.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...parts, emptyPartDraft()]);
  }

  // Typing a SKU that's in the catalog locks in its canonical name + unit +
  // category. An unknown SKU just updates the field.
  function onSkuChange(i: number, value: string) {
    const match = lookupBySku(index, value);
    if (match) {
      update(i, {
        part_number: value,
        part_name: match.part_name,
        unit: match.unit,
        category: match.category ?? "",
      });
    } else {
      update(i, { part_number: value });
    }
  }

  // Typing a known part name (or a SKU mis-typed into the name box) fills the
  // matching SKU and locks the canonical name.
  function onNameChange(i: number, value: string) {
    const match = lookupByName(index, value);
    if (match) {
      update(i, {
        part_name: match.part_name,
        part_number: match.sku ?? "",
        unit: match.unit,
        category: match.category ?? "",
      });
    } else {
      update(i, { part_name: value });
    }
  }

  return (
    <div className="space-y-3">
      {parts.map((part, i) => {
        // When the SKU resolves to a catalog entry, the name is authoritative
        // and read-only — nothing stray can be left in the name box.
        const skuMatch = lookupBySku(index, part.part_number);
        const nameLocked = !!skuMatch;
        const redline = baseline
          ? redlineFor(
              baseline,
              part.part_number || null,
              part.part_name,
              parseInt(part.quantity, 10) || 1,
            )
          : null;

        return (
          <div
            key={i}
            className={
              redline
                ? "rounded-xl border border-red-500/40 bg-red-500/5 p-3"
                : "rounded-xl border border-navy-600 bg-navy-700/40 p-3"
            }
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                Part {i + 1}
                {redline?.status === "added" && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                    NOT ON TICKET
                  </span>
                )}
                {redline?.status === "qty" && (
                  <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                    TICKET: {redline.was}
                  </span>
                )}
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
                  placeholder="e.g. SIXCTA"
                  value={part.part_number}
                  onChange={(e) => onSkuChange(i, e.target.value)}
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
                <span className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                  Part name
                  {nameLocked && (
                    <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold-400">
                      from catalog
                    </span>
                  )}
                </span>
                <input
                  className="input py-2 read-only:opacity-70"
                  placeholder="e.g. Door CT-2"
                  value={part.part_name}
                  readOnly={nameLocked}
                  onChange={(e) => onNameChange(i, e.target.value)}
                />
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
        );
      })}

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
