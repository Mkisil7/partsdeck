import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { JobList, type DashboardJob } from "@/components/dashboard/JobList";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  getUsageParts,
  getReceivedParts,
  getPartMinLevels,
} from "@/lib/queries";
import { computeLowStock } from "@/lib/lowstock";
import type { JobStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const [jobsRes, used, received, minLevels] = await Promise.all([
    supabase
      .from("jobs")
      .select(
        "id, job_number, customer_name, job_date, status, technician_name, truck_id, parts(part_name, part_number)",
      )
      .order("created_at", { ascending: false }),
    getUsageParts(),
    getReceivedParts(),
    getPartMinLevels(),
  ]);

  const lowStock = computeLowStock(received, used, minLevels);

  const jobs: DashboardJob[] = ((jobsRes.data ?? []) as any[]).map((row) => {
    const parts = (row.parts ?? []) as Array<{
      part_name: string;
      part_number: string | null;
    }>;
    const part_terms = parts
      .map((p) => `${p.part_name} ${p.part_number ?? ""}`)
      .join(" ")
      .toLowerCase();
    return {
      id: row.id,
      job_number: row.job_number,
      customer_name: row.customer_name,
      job_date: row.job_date,
      status: row.status as JobStatus,
      technician_name: row.technician_name,
      truck_id: row.truck_id,
      parts_count: parts.length,
      part_terms,
    };
  });

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Dashboard"
        subtitle="Your jobs at a glance"
        action={<SignOutButton />}
      />

      {lowStock.length > 0 && (
        <Link
          href="/inventory"
          className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 transition hover:border-amber-500/70"
        >
          <WarnIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-300">
              {lowStock.length} part{lowStock.length === 1 ? "" : "s"} low on stock
            </p>
            <p className="truncate text-xs text-amber-200/80">
              {lowStock
                .slice(0, 3)
                .map((l) => `${l.part_name} (${l.onHand}/${l.min})`)
                .join(", ")}
              {lowStock.length > 3 ? "…" : ""}
            </p>
          </div>
          <span className="ml-auto shrink-0 self-center text-amber-300">›</span>
        </Link>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/transfers"
          className="card flex flex-col gap-2 p-4 transition hover:border-gold/40 active:scale-[0.98]"
        >
          <TransferIcon className="h-7 w-7 text-blue-300" />
          <span className="text-base font-semibold text-slate-100">
            Transfer Parts
          </span>
          <span className="text-xs text-slate-400">Send parts to another tech</span>
        </Link>
        <Link
          href="/receive"
          className="card flex flex-col gap-2 p-4 transition hover:border-gold/40 active:scale-[0.98]"
        >
          <ReceiveIcon className="h-7 w-7 text-green-300" />
          <span className="text-base font-semibold text-slate-100">
            Receive Inventory
          </span>
          <span className="text-xs text-slate-400">Log Wednesday pickups</span>
        </Link>
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Recent Jobs
      </h2>
      <JobList jobs={jobs} />
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
function TransferIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3l4 4-4 4" />
      <path d="M20 7H8" />
      <path d="M8 21l-4-4 4-4" />
      <path d="M4 17h12" />
    </svg>
  );
}
function ReceiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="M3.3 7 12 12l8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
