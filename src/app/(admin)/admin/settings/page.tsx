import { getSettings } from "@/lib/queries";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const s = await getSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-fg-muted">Regras gerais da plataforma.</p>
      </div>
      <SettingsForm
        initial={{
          minimum_deposit: Number(s.minimum_deposit ?? 10),
          minimum_margin: Number(s.minimum_margin ?? 0),
          provider_low_balance_threshold: Number(s.provider_low_balance_threshold ?? 50),
          maintenance_mode: Boolean(s.maintenance_mode ?? false),
          orders_enabled: Boolean(s.orders_enabled ?? true),
        }}
      />
    </div>
  );
}
