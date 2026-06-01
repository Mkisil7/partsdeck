import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  accent = "gold",
}: {
  label: string;
  value: number | string;
  accent?: "gold" | "green" | "blue";
}) {
  const accentClass = {
    gold: "text-gold-400",
    green: "text-green-300",
    blue: "text-blue-300",
  }[accent];

  return (
    <div className="card flex flex-col justify-between gap-1 p-3">
      <span className={cn("text-2xl font-extrabold tabular-nums", accentClass)}>
        {value}
      </span>
      <span className="text-xs font-medium leading-tight text-slate-400">
        {label}
      </span>
    </div>
  );
}
