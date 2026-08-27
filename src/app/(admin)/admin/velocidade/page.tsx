import { getSettings } from "@/lib/queries";
import { SpeedTiersEditor } from "@/components/admin/speed-tiers-editor";

export const dynamic = "force-dynamic";

export default async function AdminSpeedPage() {
  const s = await getSettings();
  const tiers = (Array.isArray(s.speed_tiers) ? s.speed_tiers : []) as {
    label: string;
    ids: string[];
  }[];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Velocidade dos serviços</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Destaque os serviços mais rápidos do fornecedor no topo do catálogo.
        </p>
      </div>
      <SpeedTiersEditor initial={tiers} />
    </div>
  );
}
