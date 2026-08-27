import { createClient } from "@/lib/supabase/server";
import { ServicesManager } from "@/components/admin/services-manager";
import type { Service } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .order("platform", { ascending: true })
    .order("provider_cost", { ascending: true });

  return (
    <div className="mx-auto max-w-6xl">
      <ServicesManager initial={(data ?? []) as Service[]} />
    </div>
  );
}
