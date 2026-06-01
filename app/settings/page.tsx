import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { SignOutButton } from "@/components/ui/SignOutButton";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { getUserSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getUserSettings();

  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" action={<SignOutButton />} />
      <SettingsForm
        initial={{
          warehouse_email:
            settings?.warehouse_email ?? process.env.WAREHOUSE_EMAIL_DEFAULT ?? "",
          technician_name: settings?.technician_name ?? "",
          truck_id: settings?.truck_id ?? "",
        }}
      />

      <Link
        href="/catalog"
        className="card mt-4 flex items-center justify-between transition hover:border-gold/40"
      >
        <div>
          <p className="font-semibold text-slate-100">Master Parts Catalog</p>
          <p className="text-sm text-slate-400">
            Shared SKU ↔ name list used to auto-fill job sheets
          </p>
        </div>
        <span className="text-slate-500">›</span>
      </Link>
    </div>
  );
}
