import { PageHeader } from "@/components/ui/PageHeader";
import { InventoryTabs } from "@/components/inventory/InventoryTabs";
import {
  getUsageParts,
  getReceivedParts,
  getPartMinLevels,
  getStockCounts,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [used, received, minLevels, counts] = await Promise.all([
    getUsageParts(),
    getReceivedParts(),
    getPartMinLevels(),
    getStockCounts(),
  ]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Inventory"
        subtitle="Live count, received vs. used"
      />
      <InventoryTabs
        used={used}
        received={received}
        minLevels={minLevels}
        counts={counts}
      />
    </div>
  );
}
