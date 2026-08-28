import { createAdminClient } from "@/lib/supabase/admin";
import { IntegrationsPanel } from "@/components/admin/integrations-panel";

export const dynamic = "force-dynamic";

export default async function AdminIntegrationsPage() {
  const admin = createAdminClient();
  const { count } = await admin
    .from("provider_services")
    .select("*", { count: "exact", head: true });
  const { data: latest } = await admin
    .from("provider_services")
    .select("last_synced_at")
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .single();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="display text-[2rem] leading-none">Integrações</h1>
        <p className="mt-1 text-sm text-fg-muted">Conexão com fornecedores e sincronização.</p>
      </div>
      <IntegrationsPanel
        serviceCount={count ?? 0}
        lastSync={latest?.last_synced_at ?? null}
      />
    </div>
  );
}
