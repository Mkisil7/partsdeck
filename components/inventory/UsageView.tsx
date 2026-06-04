"use client";

import { useMemo, useState } from "react";
import type { UsagePart } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Bucket = "google" | "v5" | "command" | "doorlock" | "other";
type Window = "week" | "month" | "all";

interface AggregatedPart {
  key: string;
  part_name: string;
  part_number: string | null;
  unit: string;
  bucket: Bucket;
  totalQuantity: number;
  occurrences: number;
}

function getBucket(sku: string | null): Bucket {
  const s = (sku || "").toLowerCase().trim();
  if (s.startsWith("ga")) return "google";
  if (s.startsWith("s")) return "v5";
  if (s === "adtplus-ys-r0-29") return "v5";
  if (s.startsWith("yrd")) return "doorlock";
  if (s.startsWith("six") || s.startsWith("aio") || s.startsWith("wts")) return "command";
  if (s.startsWith("adt") && s !== "adtplus-ys-r0-29") return "command";
  return "other";
}

const BUCKET_ORDER: Bucket[] = ["google", "v5", "command", "doorlock", "other"];
const BUCKET_LABELS: Record<Bucket, string> = {
  google: "Google",
  v5: "V5",
  command: "Command",
  doorlock: "Doorlock",
  other: "Other",
};

/** Most recent Tuesday at local midnight (start of the work week). */
function startOfWeek(now: Date): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() - 2 + 7) % 7; // 2 = Tuesday
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function parseJobDate(s: string): Date {
  // Treat YYYY-MM-DD as local midnight so it compares cleanly to window starts.
  return new Date(`${s}T00:00:00`);
}

function aggregate(parts: UsagePart[]): AggregatedPart[] {
  const map = new Map<string, AggregatedPart>();
  for (const part of parts) {
    const bucket = getBucket(part.part_number);
    const key = `${bucket}::${(part.part_number || part.part_name).toLowerCase()}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalQuantity += part.quantity;
      existing.occurrences += 1;
      if (!existing.part_number && part.part_number)
        existing.part_number = part.part_number;
    } else {
      map.set(key, {
        key,
        part_name: part.part_name,
        part_number: part.part_number,
        unit: part.unit,
        bucket,
        totalQuantity: part.quantity,
        occurrences: 1,
      });
    }
  }
  return Array.from(map.values());
}

const WINDOW_LABELS: Record<Window, string> = {
  week: "This week",
  month: "This month",
  all: "All time",
};

export function UsageView({ parts }: { parts: UsagePart[] }) {
  const [window, setWindow] = useState<Window>("week");

  const inWindow = useMemo(() => {
    if (window === "all") return parts;
    const now = new Date();
    const start = window === "week" ? startOfWeek(now) : startOfMonth(now);
    return parts.filter((p) => {
      if (!p.job_date) return false;
      return parseJobDate(p.job_date) >= start;
    });
  }, [parts, window]);

  const aggregated = useMemo(() => aggregate(inWindow), [inWindow]);

  const totalUnits = aggregated.reduce((sum, p) => sum + p.totalQuantity, 0);
  const frequent = aggregated.filter((p) => p.occurrences >= 3).length;

  const byBucket = BUCKET_ORDER.map((bucket) => {
    const items = aggregated
      .filter((p) => p.bucket === bucket)
      .sort((a, b) => b.totalQuantity - a.totalQuantity);
    const units = items.reduce((sum, p) => sum + p.totalQuantity, 0);
    return { bucket, items, units };
  }).filter((group) => group.items.length > 0);

  return (
    <div>
      {/* Window toggle */}
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-navy-700/60 p-1">
        {(Object.keys(WINDOW_LABELS) as Window[]).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWindow(w)}
            className={cn(
              "rounded-lg py-2 text-sm font-semibold transition",
              window === w
                ? "bg-gold text-navy shadow-gold"
                : "text-slate-400 hover:text-slate-200",
            )}
          >
            {WINDOW_LABELS[w]}
          </button>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2">
        <Stat label="Distinct parts" value={aggregated.length} />
        <Stat label="Units used" value={totalUnits} accent />
        <Stat label="Frequent (3+)" value={frequent} />
      </div>

      {byBucket.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">
          No parts pulled {window === "all" ? "yet" : WINDOW_LABELS[window].toLowerCase()}.
        </div>
      ) : (
        <div className="space-y-6">
          {byBucket.map((group) => (
            <section key={group.bucket}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gold-400">
                  {BUCKET_LABELS[group.bucket]}
                </h2>
                <span className="text-xs font-semibold text-slate-400">
                  {group.units} used
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.items.map((item) => (
                  <li
                    key={item.key}
                    className={cn(
                      "card flex items-center justify-between gap-3 py-3",
                      item.occurrences >= 3 && "border-gold/50 bg-gold/5",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-slate-100">
                          {item.part_name}
                        </span>
                        {item.occurrences >= 3 && (
                          <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold-400">
                            ×{item.occurrences} jobs
                          </span>
                        )}
                      </div>
                      {item.part_number && (
                        <span className="font-mono text-xs text-slate-500">
                          {item.part_number}
                        </span>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-lg font-bold tabular-nums text-slate-100">
                        {item.totalQuantity}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {item.unit}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="card p-3">
      <span
        className={cn(
          "text-2xl font-extrabold tabular-nums",
          accent ? "text-gold-400" : "text-slate-100",
        )}
      >
        {value}
      </span>
      <span className="block text-xs text-slate-400">{label}</span>
    </div>
  );
}
