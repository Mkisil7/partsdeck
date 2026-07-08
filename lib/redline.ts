// Redline helpers: diff a job's current parts against the originally parsed
// ticket (job.parsed_data) so edits made after upload stand out.
import { partMatchKey } from "./buckets";
import type { ParsedJob } from "./types";

export interface BaselineEntry {
  key: string;
  part_name: string;
  part_number: string | null;
  quantity: number;
}

/** Aggregate the original parsed parts into a baseline keyed like the live
 *  parts (SKU when present, else name). Duplicate ticket lines merge. */
export function baselineFromParsed(
  parsed: ParsedJob | null | undefined,
): Map<string, BaselineEntry> {
  const map = new Map<string, BaselineEntry>();
  for (const p of parsed?.parts ?? []) {
    const name = (p.part_name || p.part_number || "").trim();
    if (!name) continue;
    const key = partMatchKey(p.part_number, name);
    const qty = p.quantity != null && p.quantity > 0 ? p.quantity : 1;
    const existing = map.get(key);
    if (existing) existing.quantity += qty;
    else
      map.set(key, {
        key,
        part_name: name,
        part_number: p.part_number?.trim() || null,
        quantity: qty,
      });
  }
  return map;
}

export type Redline =
  | { status: "added" }
  | { status: "qty"; was: number }
  | null;

/** Redline for one live part against the baseline. */
export function redlineFor(
  baseline: Map<string, BaselineEntry>,
  part_number: string | null | undefined,
  part_name: string,
  quantity: number,
): Redline {
  if (baseline.size === 0) return null;
  const entry = baseline.get(partMatchKey(part_number ?? null, part_name));
  if (!entry) return { status: "added" };
  if (entry.quantity !== quantity) return { status: "qty", was: entry.quantity };
  return null;
}

/** Baseline entries with no matching live part — removed from the ticket. */
export function removedFromBaseline(
  baseline: Map<string, BaselineEntry>,
  liveKeys: Iterable<string>,
): BaselineEntry[] {
  const live = new Set(liveKeys);
  return Array.from(baseline.values()).filter((b) => !live.has(b.key));
}
