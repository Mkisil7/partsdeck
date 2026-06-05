"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getBucket,
  BUCKET_ORDER,
  BUCKET_LABELS,
  partMatchKey,
  type Bucket,
} from "@/lib/buckets";
import { minLevelMap } from "@/lib/lowstock";
import type { UsagePart, ReceivedPart } from "@/lib/queries";
import type { PartMinLevel } from "@/lib/types";

interface Row {
  key: string;
  part_name: string;
  part_number: string | null;
  unit: string;
  bucket: Bucket;
  received: number;
  used: number;
}

export function OnHandView({
  used,
  received,
  minLevels,
}: {
  used: UsagePart[];
  received: ReceivedPart[];
  minLevels: PartMinLevel[];
}) {
  const [spotCheck, setSpotCheck] = useState(false);
  // Physical counts entered during a spot check, keyed by row key.
  const [counts, setCounts] = useState<Record<string, string>>({});

  const mins = useMemo(() => minLevelMap(minLevels), [minLevels]);

  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    const ensure = (part_number: string | null, part_name: string, unit: string) => {
      const key = partMatchKey(part_number, part_name);
      let row = map.get(key);
      if (!row) {
        row = {
          key,
          part_name,
          part_number,
          unit: unit || "each",
          bucket: getBucket(part_number),
          received: 0,
          used: 0,
        };
        map.set(key, row);
      }
      return row;
    };
    for (const r of received) {
      ensure(r.part_number, r.part_name, r.unit).received += r.quantity;
    }
    for (const u of used) {
      const row = ensure(u.part_number, u.part_name, u.unit);
      row.used += u.quantity;
      if (!row.part_number && u.part_number) row.part_number = u.part_number;
    }
    return Array.from(map.values());
  }, [received, used]);

  const totalOnHand = rows.reduce((s, r) => s + (r.received - r.used), 0);
  const totalReceived = rows.reduce((s, r) => s + r.received, 0);
  const totalUsed = rows.reduce((s, r) => s + r.used, 0);

  const byBucket = BUCKET_ORDER.map((bucket) => ({
    bucket,
    items: rows
      .filter((r) => r.bucket === bucket)
      .sort((a, b) => b.received - b.used - (a.received - a.used)),
  })).filter((g) => g.items.length > 0);

  // Parts at or below the user-set minimum (only ones with a threshold set).
  const lowItems = rows
    .filter((r) => {
      const min = mins.get(r.key);
      return min != null && Math.max(0, r.received - r.used) <= min;
    })
    .sort(
      (a, b) =>
        Math.max(0, a.received - a.used) - (mins.get(a.key) ?? 0) -
        (Math.max(0, b.received - b.used) - (mins.get(b.key) ?? 0)),
    );

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="On hand" value={totalOnHand} accent />
        <Stat label="Received" value={totalReceived} />
        <Stat label="Used" value={totalUsed} />
      </div>

      <button
        type="button"
        onClick={() => setSpotCheck((s) => !s)}
        className={cn(
          "mb-4 w-full rounded-xl border py-2.5 text-sm font-semibold transition",
          spotCheck
            ? "border-gold bg-gold/10 text-gold-400"
            : "border-navy-600 bg-navy-700/40 text-slate-300",
        )}
      >
        {spotCheck ? "Done spot checking" : "Start spot check"}
      </button>

      {lowItems.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            <WarnIcon className="h-4 w-4" />
            {lowItems.length} part{lowItems.length === 1 ? "" : "s"} low on stock
          </p>
          <ul className="mt-2 space-y-1">
            {lowItems.map((r) => (
              <li
                key={r.key}
                className="flex items-center justify-between gap-2 text-xs text-amber-200/90"
              >
                <span className="truncate">{r.part_name}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {Math.max(0, r.received - r.used)} / {mins.get(r.key)} min
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">
          No inventory yet. Tap “Receive Inventory” on the dashboard to log a pickup.
        </div>
      ) : (
        <div className="space-y-6">
          {byBucket.map((group) => (
            <section key={group.bucket}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold-400">
                {BUCKET_LABELS[group.bucket]}
              </h2>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.items.map((item) => {
                  const onHand = Math.max(0, item.received - item.used);
                  const min = mins.get(item.key);
                  const low = min != null && onHand <= min;
                  const raw = counts[item.key];
                  const actual = raw === "" || raw === undefined ? null : parseInt(raw, 10);
                  const diff = actual == null ? null : actual - onHand;
                  return (
                    <li
                      key={item.key}
                      className={cn(
                        "card py-3",
                        low && "border-amber-500/50 bg-amber-500/5",
                        diff != null && diff !== 0 && "border-red-500/50 bg-red-500/5",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium text-slate-100">
                              {item.part_name}
                            </p>
                            {low && (
                              <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                                LOW
                              </span>
                            )}
                          </div>
                          {item.part_number && (
                            <p className="font-mono text-xs text-slate-500">
                              {item.part_number}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={cn(
                              "text-lg font-bold tabular-nums",
                              onHand < 0 ? "text-red-300" : "text-slate-100",
                            )}
                          >
                            {onHand}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            on hand
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                        <span>+{item.received} received</span>
                        <span>−{item.used} used</span>
                        {min != null && (
                          <span className={cn(low && "text-amber-300")}>
                            min {min}
                          </span>
                        )}
                      </div>

                      {spotCheck && (
                        <div className="mt-2 flex items-center gap-2 border-t border-navy-600/60 pt-2">
                          <span className="text-xs text-slate-400">Counted</span>
                          <input
                            type="number"
                            inputMode="numeric"
                            placeholder="—"
                            className="input w-20 py-1 text-center"
                            value={raw ?? ""}
                            onChange={(e) =>
                              setCounts((c) => ({ ...c, [item.key]: e.target.value }))
                            }
                          />
                          {diff != null && (
                            <span
                              className={cn(
                                "text-xs font-semibold",
                                diff === 0
                                  ? "text-green-300"
                                  : diff < 0
                                    ? "text-red-300"
                                    : "text-amber-300",
                              )}
                            >
                              {diff === 0
                                ? "✓ matches"
                                : diff < 0
                                  ? `${Math.abs(diff)} missing`
                                  : `${diff} extra`}
                            </span>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
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

function WarnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
