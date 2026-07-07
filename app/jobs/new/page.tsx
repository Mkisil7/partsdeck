import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewJobForm } from "@/components/jobs/NewJobForm";
import { getUserSettings, getMasterParts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const [settings, masterParts] = await Promise.all([
    getUserSettings(),
    getMasterParts(),
  ]);

  const catalog = masterParts.map((m) => ({
    sku: m.sku,
    part_name: m.part_name,
    unit: m.unit,
    category: m.category,
  }));

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="New Job"
        subtitle="Snap a sheet, paste it, or type it in"
        action={
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-gold-400">
            Cancel
          </Link>
        }
      />
      <NewJobForm
        defaults={{
          technician_name: settings?.technician_name ?? null,
          truck_id: settings?.truck_id ?? null,
        }}
        catalog={catalog}
      />
    </div>
  );
}
