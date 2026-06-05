import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { TransferForm } from "@/components/transfers/TransferForm";
import { getMasterParts, getTransfers, getUserSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function TransfersPage() {
  const [masterParts, history, settings] = await Promise.all([
    getMasterParts(),
    getTransfers(),
    getUserSettings(),
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
        title="Transfer Parts"
        subtitle="Send parts to another tech"
        action={
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-gold-400">
            Back
          </Link>
        }
      />
      <TransferForm
        catalog={catalog}
        history={history}
        defaults={{ sender_name: settings?.technician_name ?? null }}
      />
    </div>
  );
}
