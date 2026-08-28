import Link from "next/link";
import { Gift, ArrowRight } from "lucide-react";
import { getActiveServices } from "@/lib/catalog/services";
import { getBalance, getSettings } from "@/lib/queries";
import { CatalogExplorer } from "@/components/catalog/catalog-explorer";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const [services, balance, settings] = await Promise.all([
    getActiveServices(),
    getBalance(),
    getSettings(),
  ]);

  const bonusEnabled = settings.bonus_enabled !== false;
  const tiers = (Array.isArray(settings.deposit_bonuses) ? settings.deposit_bonuses : []) as {
    min: number;
    followers: number;
  }[];
  const topTier = tiers.slice().sort((a, b) => Number(b.followers) - Number(a.followers))[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comprar serviço</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Escolha a plataforma, o serviço e a quantidade.
        </p>
      </div>

      {bonusEnabled && topTier && (
        <Link
          href="/wallet"
          className="group flex items-center justify-between gap-4 rounded-xl border border-primary/30 p-4 transition-colors hover:border-primary/50"
          style={{ background: "linear-gradient(100deg, rgba(242,99,34,0.16), rgba(242,99,34,0.04))" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary-soft">
              <Gift className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-fg">
                Deposite e ganhe até {new Intl.NumberFormat("pt-BR").format(topTier.followers)} seguidores grátis
              </p>
              <p className="text-sm text-fg-muted">
                Bônus liberado na hora após o pagamento. Toque para depositar.
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary-soft transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}

      <CatalogExplorer services={services} balance={balance} />
    </div>
  );
}
