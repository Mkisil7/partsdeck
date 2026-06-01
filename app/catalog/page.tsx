import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { CatalogManager } from "@/components/catalog/CatalogManager";
import { IgnoreListManager } from "@/components/catalog/IgnoreListManager";
import { getMasterParts, getIgnoredItems } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const [parts, ignored] = await Promise.all([
    getMasterParts(),
    getIgnoredItems(),
  ]);

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

      <div className="mt-8 mb-3 border-t border-white/5 pt-6">
        <h2 className="text-lg font-semibold text-slate-100">Ignore list</h2>
        <p className="text-sm text-slate-400">
          Work-order lines to skip during scanning
        </p>
      </div>
      <IgnoreListManager initial={ignored} />
    </div>
  );
}
