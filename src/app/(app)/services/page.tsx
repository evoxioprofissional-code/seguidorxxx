import { getActiveServices } from "@/lib/catalog/services";
import { getBalance } from "@/lib/queries";
import { CatalogExplorer } from "@/components/catalog/catalog-explorer";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const [services, balance] = await Promise.all([getActiveServices(), getBalance()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comprar serviço</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Escolha a plataforma, o serviço e a quantidade. Simples assim.
        </p>
      </div>
      <CatalogExplorer services={services} balance={balance} />
    </div>
  );
}
