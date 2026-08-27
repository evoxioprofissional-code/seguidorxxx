import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { ApiPanel } from "@/components/api/api-panel";
import type { ApiKey } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function IntegracaoPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("api_keys")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  const apiUrl = `${publicEnv.appUrl.replace(/\/$/, "")}/api/v2`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API de Revenda</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Integre o SeguidorX no seu próprio site e revenda com sua marca.
        </p>
      </div>
      <ApiPanel initialKeys={(data ?? []) as ApiKey[]} apiUrl={apiUrl} />
    </div>
  );
}
