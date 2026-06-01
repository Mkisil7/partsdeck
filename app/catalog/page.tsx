import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { CatalogManager } from "@/components/catalog/CatalogManager";
import { getMasterParts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const parts = await getMasterParts();

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Master Parts"
        subtitle="Shared SKU ↔ name catalog"
        action={
          <Link href="/settings" className="text-sm text-slate-400 hover:text-gold-400">
            Back
          </Link>
        }
      />
      <CatalogManager initial={parts} />
    </div>
  );
}
