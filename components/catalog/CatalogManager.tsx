"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { PART_CATEGORIES, type MasterPart, type PartCategory } from "@/lib/types";

export function CatalogManager({ initial }: { initial: MasterPart[] }) {
  const { toast } = useToast();
  const [parts, setParts] = useState<MasterPart[]>(initial);
  const [query, setQuery] = useState("");
  const [showImport, setShowImport] = useState(false);

  // Add form
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PartCategory | "">("");
  const [unit, setUnit] = useState("each");
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parts;
    return parts.filter(
      (p) =>
        p.part_name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q),
    );
  }, [parts, query]);

  async function refresh() {
    const res = await fetch("/api/master-parts");
    if (res.ok) setParts((await res.json()).parts as MasterPart[]);
  }

  async function addPart() {
    if (!name.trim() && !sku.trim()) {
      toast("Enter a SKU or a name", "error");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/master-parts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: sku.trim(),
          part_name: name.trim() || sku.trim(),
          category: category || null,
          unit: unit.trim() || "each",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Add failed");
      setParts((ps) =>
        [...ps, json.part as MasterPart].sort((a, b) =>
          a.part_name.localeCompare(b.part_name),
        ),
      );
      setSku("");
      setName("");
      setCategory("");
      setUnit("each");
      toast("Added to catalog", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not add", "error");
    } finally {
      setAdding(false);
    }
  }

  async function updatePart(part: MasterPart, patch: Partial<MasterPart>) {
    try {
      const res = await fetch(`/api/master-parts/${part.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Update failed");
      setParts((ps) => ps.map((p) => (p.id === part.id ? { ...p, ...patch } : p)));
      toast("Saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save", "error");
    }
  }

  async function deletePart(part: MasterPart) {
    if (!confirm(`Remove ${part.part_name} from the catalog?`)) return;
    const snapshot = parts;
    setParts((ps) => ps.filter((p) => p.id !== part.id));
    try {
      const res = await fetch(`/api/master-parts/${part.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
    } catch (err) {
      setParts(snapshot);
      toast(err instanceof Error ? err.message : "Could not delete", "error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Add a single entry */}
      <div className="card space-y-2">
        <h2 className="text-sm font-semibold text-slate-200">Add a part</h2>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="input py-2"
            placeholder="SKU / Part #"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <input
            className="input py-2"
            placeholder="Unit (each)"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
          <input
            className="input col-span-2 py-2"
            placeholder="Part name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="input col-span-2 py-2"
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
            onClick={addPart}
            disabled={adding}
            className="btn-gold flex-1 py-2 text-sm"
          >
            {adding ? "Adding…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => setShowImport((v) => !v)}
            className="btn-ghost py-2 text-sm"
          >
            Bulk import
          </button>
        </div>
      </div>

      {showImport && <ImportPanel onDone={refresh} onClose={() => setShowImport(false)} />}

      {/* Search + list */}
      <input
        type="search"
        className="input"
        placeholder="Search the catalog…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <p className="text-xs text-slate-500">
        {parts.length} part{parts.length === 1 ? "" : "s"} in the shared catalog
      </p>

      <ul className="space-y-2">
        {filtered.map((part) => (
          <CatalogRow
            key={part.id}
            part={part}
            onSave={(patch) => updatePart(part, patch)}
            onDelete={() => deletePart(part)}
          />
        ))}
        {filtered.length === 0 && (
          <li className="card text-sm text-slate-400">
            {parts.length === 0
              ? "Your catalog is empty. Add parts above or bulk import."
              : "No matches."}
          </li>
        )}
      </ul>
    </div>
  );
}

function CatalogRow({
  part,
  onSave,
  onDelete,
}: {
  part: MasterPart;
  onSave: (patch: Partial<MasterPart>) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [sku, setSku] = useState(part.sku ?? "");
  const [name, setName] = useState(part.part_name);
  const [category, setCategory] = useState<PartCategory | "">(
    (part.category ?? "") as PartCategory | "",
  );

  if (editing) {
    return (
      <li className="card space-y-2 py-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            className="input py-2"
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
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
          <input
            className="input col-span-2 py-2"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-gold flex-1 py-2 text-sm"
            onClick={() => {
              if (!name.trim() && !sku.trim()) return;
              onSave({
                sku: sku.trim() || null,
                part_name: name.trim() || sku.trim(),
                category: category || null,
              });
              setEditing(false);
            }}
          >
            Save
          </button>
          <button
            type="button"
            className="btn-ghost py-2 text-sm"
            onClick={() => setEditing(false)}
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
          {part.sku ? <span className="font-mono">{part.sku}</span> : "no SKU"}
          {part.category ? ` · ${part.category}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-3">
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
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function ImportPanel({
  onDone,
  onClose,
}: {
  onDone: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!csv.trim()) return toast("Paste some rows first", "error");
    setBusy(true);
    try {
      const res = await fetch("/api/master-parts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");
      toast(`Imported ${json.added}, skipped ${json.skipped} duplicate(s)`, "success");
      setCsv("");
      onDone();
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Import failed", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-2 animate-fade-in">
      <h3 className="text-sm font-semibold text-slate-200">Bulk import (CSV)</h3>
      <p className="text-xs text-slate-500">
        Paste rows with a header line. Recognized columns:{" "}
        <span className="font-mono">sku, part_name, category, unit, notes</span>. Or
        just two columns <span className="font-mono">sku,name</span> with no header.
        Duplicates (by SKU or name) are skipped.
      </p>
      <textarea
        className="input min-h-[140px] font-mono text-sm"
        placeholder={"sku,part_name,category\nBR-4471,Brake pads,mechanical\nDEF-2.5L,Diesel exhaust fluid,fluids"}
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="btn-gold flex-1 py-2 text-sm"
        >
          {busy ? "Importing…" : "Import"}
        </button>
        <button type="button" onClick={onClose} className="btn-ghost py-2 text-sm">
          Close
        </button>
      </div>
    </div>
  );
}
