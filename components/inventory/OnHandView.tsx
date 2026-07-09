"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { PartSearchInput } from "@/components/parts/PartSearchInput";
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
import type { CatalogEntry } from "@/lib/master";
import type { CompanyCount, PartMinLevel, StockCount } from "@/lib/types";

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
  counts,
  companyCounts,
  catalog = [],
}: {
  used: UsagePart[];
  received: ReceivedPart[];
  minLevels: PartMinLevel[];
  counts: StockCount[];
  companyCounts: CompanyCount[];
  catalog?: CatalogEntry[];
}) {
  const { toast } = useToast();
  const [counting, setCounting] = useState(false);

  // Persisted physical counts ("I actually have"), keyed by row key.
  const [saved, setSaved] = useState<Record<string, StockCount>>(() =>
    Object.fromEntries(counts.map((c) => [c.part_key, c])),
  );
  // Persisted company overrides ("company thinks"), keyed by row key.
  const [overrides, setOverrides] = useState<Record<string, CompanyCount>>(() =>
    Object.fromEntries(companyCounts.map((c) => [c.part_key, c])),
  );
  // Input drafts while count mode is open.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [companyDrafts, setCompanyDrafts] = useState<Record<string, string>>({});
  // Parts added via search this session (not yet in the ledger).
  const [extraParts, setExtraParts] = useState<
    { part_number: string | null; part_name: string; unit: string }[]
  >([]);

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
    // Parts known only from saved counts/overrides (or added via search this
    // session) still get a row, so company-set figures never disappear.
    for (const c of companyCounts) ensure(c.sku, c.part_name, "each");
    for (const c of counts) ensure(c.sku, c.part_name, "each");
    for (const e of extraParts) ensure(e.part_number, e.part_name, e.unit);
    return Array.from(map.values());
  }, [received, used, counts, companyCounts, extraParts]);

  // "Company thinks": manual override when set, else the ledger figure.
  const companyOnHand = (r: Row) =>
    overrides[r.key]
      ? overrides[r.key].company_qty
      : Math.max(0, r.received - r.used);

  const totalCompany = rows.reduce((s, r) => s + companyOnHand(r), 0);
  const countedRows = rows.filter((r) => saved[r.key]);
  const totalCounted = countedRows.reduce(
    (s, r) => s + saved[r.key].counted_qty,
    0,
  );
  const mismatched = countedRows.filter(
    (r) => saved[r.key].counted_qty !== companyOnHand(r),
  ).length;

  const byBucket = BUCKET_ORDER.map((bucket) => ({
    bucket,
    items: rows
      .filter((r) => r.bucket === bucket)
      .sort((a, b) => companyOnHand(b) - companyOnHand(a)),
  })).filter((g) => g.items.length > 0);

  // Parts at or below the user-set minimum (only ones with a threshold set).
  const lowItems = rows
    .filter((r) => {
      const min = mins.get(r.key);
      return min != null && companyOnHand(r) <= min;
    })
    .sort(
      (a, b) =>
        companyOnHand(a) - (mins.get(a.key) ?? 0) -
        (companyOnHand(b) - (mins.get(b.key) ?? 0)),
    );

  function startCounting() {
    setDrafts(
      Object.fromEntries(
        rows.map((r) => [
          r.key,
          saved[r.key] ? String(saved[r.key].counted_qty) : "",
        ]),
      ),
    );
    setCompanyDrafts(
      Object.fromEntries(rows.map((r) => [r.key, String(companyOnHand(r))])),
    );
    setCounting(true);
  }

  function addTrackedPart(entry: CatalogEntry) {
    const key = partMatchKey(entry.sku, entry.part_name);
    if (rows.some((r) => r.key === key)) {
      toast("That part is already listed", "info");
      return;
    }
    setExtraParts((prev) => [
      ...prev,
      {
        part_number: entry.sku,
        part_name: entry.part_name,
        unit: entry.unit || "each",
      },
    ]);
    setDrafts((d) => ({ ...d, [key]: "" }));
    setCompanyDrafts((d) => ({ ...d, [key]: "" }));
  }

  async function persistCompany(row: Row) {
    const raw = (companyDrafts[row.key] ?? "").trim();
    const existing = overrides[row.key];
    const derived = Math.max(0, row.received - row.used);

    // Cleared input reverts to the derived ledger figure.
    if (raw === "") {
      if (!existing) return;
      try {
        const res = await fetch("/api/company-counts", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ part_key: row.key }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
        setOverrides((s) => {
          const next = { ...s };
          delete next[row.key];
          return next;
        });
        setCompanyDrafts((d) => ({ ...d, [row.key]: String(derived) }));
      } catch (err) {
        toast(err instanceof Error ? err.message : "Could not update", "error");
      }
      return;
    }

    const qty = parseInt(raw, 10);
    if (!Number.isFinite(qty) || qty < 0) {
      toast("Enter a valid number", "error");
      return;
    }
    if (existing ? existing.company_qty === qty : qty === derived) return;

    try {
      const res = await fetch("/api/company-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part_key: row.key,
          part_number: row.part_number,
          part_name: row.part_name,
          company_qty: qty,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setOverrides((s) => ({ ...s, [row.key]: json.count as CompanyCount }));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save", "error");
    }
  }

  async function persistCount(row: Row) {
    const raw = (drafts[row.key] ?? "").trim();
    const existing = saved[row.key];

    // Cleared input removes the saved count.
    if (raw === "") {
      if (!existing) return;
      try {
        const res = await fetch("/api/stock-counts", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ part_key: row.key }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Delete failed");
        setSaved((s) => {
          const next = { ...s };
          delete next[row.key];
          return next;
        });
      } catch (err) {
        toast(err instanceof Error ? err.message : "Could not clear count", "error");
      }
      return;
    }

    const qty = parseInt(raw, 10);
    if (!Number.isFinite(qty) || qty < 0) {
      toast("Enter a valid count", "error");
      return;
    }
    if (existing && existing.counted_qty === qty) return;

    try {
      const res = await fetch("/api/stock-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part_key: row.key,
          part_number: row.part_number,
          part_name: row.part_name,
          counted_qty: qty,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setSaved((s) => ({ ...s, [row.key]: json.count as StockCount }));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save count", "error");
    }
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="Company says" value={totalCompany} accent />
        <Stat label="You counted" value={totalCounted} />
        <Stat label="Mismatched" value={mismatched} danger={mismatched > 0} />
      </div>

      <button
        type="button"
        onClick={() => (counting ? setCounting(false) : startCounting())}
        className={cn(
          "mb-4 w-full rounded-xl border py-2.5 text-sm font-semibold transition",
          counting
            ? "border-gold bg-gold/10 text-gold-400"
            : "border-navy-600 bg-navy-700/40 text-slate-300",
        )}
      >
        {counting ? "Done updating" : "Update counts"}
      </button>

      {counting && (
        <div className="mb-4">
          <PartSearchInput
            catalog={catalog}
            onPick={addTrackedPart}
            placeholder="Add a part that isn’t listed…"
          />
          <p className="mt-1 text-[11px] text-slate-500">
            For parts the company says you have but you’ve never logged here.
          </p>
        </div>
      )}

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
                  {companyOnHand(r)} / {mins.get(r.key)} min
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
                  const company = companyOnHand(item);
                  const override = overrides[item.key];
                  const min = mins.get(item.key);
                  const low = min != null && company <= min;
                  const count = saved[item.key];
                  const diff = count ? count.counted_qty - company : null;
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
                        <div className="flex shrink-0 items-start gap-4 text-right">
                          <div>
                            <span className="text-lg font-bold tabular-nums text-slate-100">
                              {company}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              company
                            </span>
                          </div>
                          {count && (
                            <div>
                              <span
                                className={cn(
                                  "text-lg font-bold tabular-nums",
                                  diff === 0 ? "text-green-300" : "text-red-300",
                                )}
                              >
                                {count.counted_qty}
                              </span>
                              <span className="block text-[10px] text-slate-500">
                                you have
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span>+{item.received} received</span>
                        <span>−{item.used} used</span>
                        {override && (
                          <span className="text-sky-300">
                            company set {new Date(override.set_at).toLocaleDateString()}
                          </span>
                        )}
                        {min != null && (
                          <span className={cn(low && "text-amber-300")}>
                            min {min}
                          </span>
                        )}
                        {count && (
                          <span
                            className={cn(
                              "font-semibold",
                              diff === 0
                                ? "text-green-300"
                                : diff != null && diff < 0
                                  ? "text-red-300"
                                  : "text-amber-300",
                            )}
                          >
                            {diff === 0
                              ? "✓ matches"
                              : diff != null && diff < 0
                                ? `${Math.abs(diff)} missing`
                                : `${diff} extra`}{" "}
                            · counted {new Date(count.counted_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {counting && (
                        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-navy-600/60 pt-2">
                          <label>
                            <span className="mb-1 block text-[11px] text-slate-400">
                              Company thinks
                            </span>
                            <input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              placeholder="—"
                              className="input w-full py-1 text-center"
                              value={companyDrafts[item.key] ?? ""}
                              onChange={(e) =>
                                setCompanyDrafts((d) => ({
                                  ...d,
                                  [item.key]: e.target.value,
                                }))
                              }
                              onBlur={() => persistCompany(item)}
                            />
                          </label>
                          <label>
                            <span className="mb-1 block text-[11px] text-slate-400">
                              I actually have
                            </span>
                            <input
                              type="number"
                              min={0}
                              inputMode="numeric"
                              placeholder="—"
                              className="input w-full py-1 text-center"
                              value={drafts[item.key] ?? ""}
                              onChange={(e) =>
                                setDrafts((d) => ({ ...d, [item.key]: e.target.value }))
                              }
                              onBlur={() => persistCount(item)}
                            />
                          </label>
                          <p className="col-span-2 text-[11px] text-slate-500">
                            Saves automatically when you tap away.
                          </p>
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
  danger,
}: {
  label: string;
  value: number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="card p-3">
      <span
        className={cn(
          "text-2xl font-extrabold tabular-nums",
          danger ? "text-red-300" : accent ? "text-gold-400" : "text-slate-100",
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
