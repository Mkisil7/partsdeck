import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { JobList, type DashboardJob } from "@/components/dashboard/JobList";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getDashboardStats } from "@/lib/queries";
import type { JobStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const [stats, jobsRes] = await Promise.all([
    getDashboardStats(),
    supabase
      .from("jobs")
      .select(
        "id, job_number, customer_name, job_date, status, technician_name, truck_id, parts(part_name, part_number)",
      )
      .order("created_at", { ascending: false }),
  ]);

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

      <div className="mb-6 grid grid-cols-2 gap-2">
        <StatCard
          label="Parts Transferred (mo)"
          value={stats.partsTransferredThisMonth}
          accent="blue"
        />
        <StatCard
          label="Pending Transfers"
          value={stats.pendingTransfers}
          accent="green"
        />
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Recent Jobs
      </h2>
      <JobList jobs={jobs} />
    </div>
  );
}
