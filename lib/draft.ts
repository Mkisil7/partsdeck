// Helpers to convert between AI-parsed payloads and editable form drafts.
import type { JobDraft, ParsedJob, PartDraft } from "./types";
import { partKey } from "./master";
import { todayIso } from "./utils";

/**
 * Merge duplicate parts (same SKU, or same name when no SKU) into one row,
 * summing quantities. Keeps the richest non-empty fields from each duplicate.
 */
export function dedupePartDrafts(parts: PartDraft[]): PartDraft[] {
  const merged = new Map<string, PartDraft>();
  for (const part of parts) {
    const hasContent = part.part_name.trim() || part.part_number.trim();
    if (!hasContent) continue;
    const key = partKey(part);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...part });
      continue;
    }
    const qa = parseInt(existing.quantity, 10);
    const qb = parseInt(part.quantity, 10);
    existing.quantity = String(
      (Number.isNaN(qa) ? 0 : qa) + (Number.isNaN(qb) ? 0 : qb),
    );
    existing.part_number = existing.part_number || part.part_number;
    existing.part_name = existing.part_name || part.part_name;
    existing.category = existing.category || part.category;
    existing.notes = [existing.notes, part.notes].filter(Boolean).join("; ");
  }
  return Array.from(merged.values());
}

export function emptyPartDraft(): PartDraft {
  return {
    part_number: "",
    part_name: "",
    quantity: "1",
    unit: "each",
    category: "",
    notes: "",
  };
}

export function emptyJobDraft(defaults?: {
  technician_name?: string | null;
  truck_id?: string | null;
}): JobDraft {
  return {
    job_number: "",
    customer_name: "",
    job_date: todayIso(),
    technician_name: defaults?.technician_name ?? "",
    truck_id: defaults?.truck_id ?? "",
    notes: "",
    parts: [emptyPartDraft()],
  };
}

/** Merge an AI-parsed result into a draft, keeping form defaults as fallback. */
export function parsedToDraft(
  parsed: ParsedJob,
  defaults?: { technician_name?: string | null; truck_id?: string | null },
): JobDraft {
  const parts: PartDraft[] =
    parsed.parts.length > 0
      ? parsed.parts.map((p) => ({
          part_number: p.part_number ?? "",
          part_name: p.part_name ?? "",
          quantity: p.quantity != null ? String(p.quantity) : "1",
          unit: p.unit ?? "each",
          category: p.category ?? "",
          notes: p.notes ?? "",
        }))
      : [emptyPartDraft()];

  return {
    job_number: parsed.job_number ?? "",
    customer_name: parsed.customer_name ?? "",
    job_date: parsed.job_date ?? todayIso(),
    technician_name: parsed.technician_name ?? defaults?.technician_name ?? "",
    truck_id: parsed.truck_id ?? defaults?.truck_id ?? "",
    notes: "",
    parts,
  };
}
