import { PageHeader } from "@/components/ui/PageHeader";
import { InventoryTabs } from "@/components/inventory/InventoryTabs";
import {
  getUsageParts,
  getReceivedParts,
  getPartMinLevels,
  getStockCounts,
  getCompanyCounts,
  getMasterParts,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const [used, received, minLevels, counts, companyCounts, masterParts] =
    await Promise.all([
      getUsageParts(),
      getReceivedParts(),
      getPartMinLevels(),
      getStockCounts(),
      getCompanyCounts(),
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
        title="Inventory"
        subtitle="Live count, received vs. used"
      />
      <InventoryTabs
        used={used}
        received={received}
        minLevels={minLevels}
        counts={counts}
        companyCounts={companyCounts}
        catalog={catalog}
      />
    </div>
  );
}
