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
    </div>
  );
}
