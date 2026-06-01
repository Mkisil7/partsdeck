import { PageHeader } from "@/components/ui/PageHeader";
import { getOpenJobParts } from "@/lib/queries";
import type { Part, PartCategory } from "@/lib/types";
import { PART_CATEGORIES } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface AggregatedPart {
  key: string;
  part_name: string;
  part_number: string | null;
  unit: string;
  category: PartCategory | "uncategorized";
  totalQuantity: number;
  occurrences: number; // how many separate line items / jobs
}

function aggregate(parts: Part[]): AggregatedPart[] {
  const map = new Map<string, AggregatedPart>();
  for (const part of parts) {
    const cat = (part.category ?? "uncategorized") as AggregatedPart["category"];
    const key = `${cat}::${(part.part_number || part.part_name).toLowerCase()}`;
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
        category: cat,
        totalQuantity: part.quantity,
        occurrences: 1,
      });
    }
  }
  return Array.from(map.values());
}

const CATEGORY_ORDER: AggregatedPart["category"][] = [
  ...PART_CATEGORIES,
  "uncategorized",
];

export default async function InventoryPage() {
  const parts = await getOpenJobParts();
  const aggregated = aggregate(parts);

  const totalUnits = aggregated.reduce((sum, p) => sum + p.totalQuantity, 0);
  const frequent = aggregated.filter((p) => p.occurrences >= 3).length;

  const byCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: aggregated
      .filter((p) => p.category === category)
      .sort((a, b) => b.totalQuantity - a.totalQuantity),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventory"
        subtitle="Parts needed across all open jobs"
      />

      <div className="mb-5 grid grid-cols-3 gap-2">
        <Stat label="Distinct parts" value={aggregated.length} />
        <Stat label="Total units" value={totalUnits} />
        <Stat label="Frequent (3+)" value={frequent} accent />
      </div>

      {byCategory.length === 0 ? (
        <div className="card text-center text-sm text-slate-400">
          No parts on open jobs yet. Create a job to start tracking inventory.
        </div>
      ) : (
        <div className="space-y-6">
          {byCategory.map((group) => (
            <section key={group.category}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold-400 capitalize">
                {group.category}
              </h2>
              <ul className="space-y-2">
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
