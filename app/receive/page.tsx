import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReceiveForm } from "@/components/inventory/ReceiveForm";
import { getMasterParts, getInventoryReceipts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function ReceivePage() {
  const [masterParts, history] = await Promise.all([
    getMasterParts(),
    getInventoryReceipts(),
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
        title="Receive Inventory"
        subtitle="Log your Wednesday pickups"
        action={
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-gold-400">
            Back
          </Link>
        }
      />
      <ReceiveForm catalog={catalog} history={history} />
    </div>
  );
}
