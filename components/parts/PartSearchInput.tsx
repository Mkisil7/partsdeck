"use client";

import { useMemo, useState } from "react";
import type { CatalogEntry } from "@/lib/master";

/**
 * A search box that autocompletes against the master catalog by SKU or name.
 * Calls onPick when the user selects a match. Also exposes the raw typed value
 * via onPick for free-text entries (when allowFreeText).
 */
export function PartSearchInput({
  catalog,
  onPick,
  placeholder = "Search part # or name…",
}: {
  catalog: CatalogEntry[];
  onPick: (entry: CatalogEntry) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter(
        (e) =>
          (e.sku && e.sku.toLowerCase().includes(q)) ||
          e.part_name.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [catalog, query]);

  function pick(entry: CatalogEntry) {
    onPick(entry);
    setQuery("");
    setOpen(false);
  }

  function pickFreeText() {
    const q = query.trim();
    if (!q) return;
    pick({ sku: null, part_name: q, unit: "each", category: null });
  }

  return (
    <div className="relative">
      <input
        className="input"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (matches[0]) pick(matches[0]);
            else pickFreeText();
          }
        }}
      />
      {open && query.trim() && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-navy-600 bg-navy-800 shadow-lg">
          {matches.map((e) => (
            <li key={`${e.sku}-${e.part_name}`}>
              <button
                type="button"
                onClick={() => pick(e)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-navy-700"
              >
                <span className="truncate text-slate-100">{e.part_name}</span>
                {e.sku && (
                  <span className="shrink-0 font-mono text-xs text-slate-500">
                    {e.sku}
                  </span>
                )}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={pickFreeText}
              className="w-full px-3 py-2 text-left text-sm text-gold-400 hover:bg-navy-700"
            >
              + Add “{query.trim()}” as-is
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
