import { PageHeader } from "@/components/ui/PageHeader";
import { UsageView } from "@/components/inventory/UsageView";
import { getUsageParts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const parts = await getUsageParts();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventory"
        subtitle="Parts pulled off your trucks"
      />
      <UsageView parts={parts} />
    </div>
  );
}
