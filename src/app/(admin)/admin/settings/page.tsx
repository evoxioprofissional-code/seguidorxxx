import { getSettings } from "@/lib/queries";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const s = await getSettings();
  const ann = (s.announcement ?? {}) as {
    enabled?: boolean;
    title?: string;
    message?: string;
  };
  const tiers = (Array.isArray(s.deposit_bonuses) ? s.deposit_bonuses : []) as {
    min: number;
    followers: number;
  }[];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="display text-[2rem] leading-none">Configurações</h1>
        <p className="mt-1 text-sm text-fg-muted">Regras gerais da plataforma.</p>
      </div>
      <SettingsForm
        initial={{
          minimum_deposit: Number(s.minimum_deposit ?? 10),
          minimum_margin: Number(s.minimum_margin ?? 0),
          provider_low_balance_threshold: Number(s.provider_low_balance_threshold ?? 50),
          reseller_discount_percentage: Number(s.reseller_discount_percentage ?? 0),
          maintenance_mode: Boolean(s.maintenance_mode ?? false),
          orders_enabled: Boolean(s.orders_enabled ?? true),
          announcement_enabled: Boolean(ann.enabled ?? false),
          announcement_title: String(ann.title ?? ""),
          announcement_message: String(ann.message ?? ""),
          bonus_enabled: Boolean(s.bonus_enabled ?? true),
          bonus_tiers: tiers.length ? tiers : [{ min: 30, followers: 1000 }],
        }}
      />
    </div>
  );
}
