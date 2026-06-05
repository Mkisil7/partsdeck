// Shared low-stock computation. Used by the dashboard alert and the inventory
// On Hand view so both agree on what counts as "low".
//
// On-hand is the additive ledger: (sum received) - (sum used), clamped at 0.
// A part is low when its user-set minimum is > 0 and on-hand <= minimum.
import { partMatchKey } from "./buckets";
import type { PartMinLevel } from "./types";
import type { ReceivedPart, UsagePart } from "./queries";

export interface LowStockItem {
  key: string;
  part_name: string;
  part_number: string | null;
  onHand: number;
  min: number;
}

/** On-hand per part key, clamped at 0. */
export function computeOnHandByKey(
  received: ReceivedPart[],
  used: UsagePart[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const r of received) {
    const key = partMatchKey(r.part_number, r.part_name);
    totals.set(key, (totals.get(key) ?? 0) + r.quantity);
  }
  for (const u of used) {
    const key = partMatchKey(u.part_number, u.part_name);
    totals.set(key, (totals.get(key) ?? 0) - u.quantity);
  }
  totals.forEach((value, key) => totals.set(key, Math.max(0, value)));
  return totals;
}

/** Map of part_key -> minimum quantity, ignoring zero/blank thresholds. */
export function minLevelMap(minLevels: PartMinLevel[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of minLevels) {
    if (m.min_quantity > 0) map.set(m.part_key, m.min_quantity);
  }
  return map;
}

/** Parts at or below their user-set minimum, lowest headroom first. */
export function computeLowStock(
  received: ReceivedPart[],
  used: UsagePart[],
  minLevels: PartMinLevel[],
): LowStockItem[] {
  const onHand = computeOnHandByKey(received, used);
  const out: LowStockItem[] = [];
  for (const m of minLevels) {
    if (m.min_quantity <= 0) continue;
    const have = onHand.get(m.part_key) ?? 0;
    if (have <= m.min_quantity) {
      out.push({
        key: m.part_key,
        part_name: m.part_name,
        part_number: m.sku,
        onHand: have,
        min: m.min_quantity,
      });
    }
  }
  // Most urgent first: biggest shortfall relative to the minimum.
  out.sort((a, b) => a.onHand - a.min - (b.onHand - b.min));
  return out;
}
