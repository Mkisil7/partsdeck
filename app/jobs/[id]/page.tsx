import Link from "next/link";
import { notFound } from "next/navigation";
import { JobDetail } from "@/components/jobs/JobDetail";
import { getJobWithParts, getUserSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [job, settings] = await Promise.all([
    getJobWithParts(params.id),
    getUserSettings(),
  ]);

  if (!job) notFound();

  const defaultWarehouseEmail =
    settings?.warehouse_email ?? process.env.WAREHOUSE_EMAIL_DEFAULT ?? "";

  return (
    <div className="animate-fade-in">
      <Link
        href="/dashboard"
        className="mb-3 inline-block text-sm text-slate-400 hover:text-gold-400"
      >
        ‹ Back to dashboard
      </Link>
      <JobDetail job={job} defaultWarehouseEmail={defaultWarehouseEmail} />
    </div>
  );
}
