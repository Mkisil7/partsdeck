// Product-line buckets for inventory grouping, keyed off the SKU.
export type Bucket = "google" | "v5" | "command" | "doorlock" | "other";

export function getBucket(sku: string | null): Bucket {
  const s = (sku || "").toLowerCase().trim();
  if (s.startsWith("ga")) return "google";
  if (s.startsWith("yrd")) return "doorlock";
  // Command checks run before the generic "s" → v5 rule so SKUs like "six..."
  // aren't swallowed by the V5 prefix.
  if (
    s.startsWith("six") ||
    s.startsWith("aio") ||
    s.startsWith("wts") ||
    s.startsWith("oc") ||
    s.startsWith("rc")
  )
    return "command";
  if (s === "adtplus-ys-r0-29") return "v5";
  if (s.startsWith("adt")) return "command";
  // V5 SKUs start with "ss" or "sts"; DWCOVER is also V5.
  if (s.startsWith("ss") || s.startsWith("sts") || s.startsWith("dwcover"))
    return "v5";
  return "other";
}

export const BUCKET_ORDER: Bucket[] = [
  "google",
  "v5",
  "command",
  "doorlock",
  "other",
];

export const BUCKET_LABELS: Record<Bucket, string> = {
  google: "Google",
  v5: "V5",
  command: "Command",
  doorlock: "Doorlock",
  other: "Other",
};

/** Stable key for matching a part across used/received ledgers. */
export function partMatchKey(part_number: string | null, part_name: string): string {
  return (part_number || part_name).toLowerCase().trim();
}
