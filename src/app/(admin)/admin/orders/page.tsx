import { createAdminClient } from "@/lib/supabase/admin";
import { StatusBadge } from "@/components/ui/badge";
import { formatBRL, formatDateTime, formatNumber } from "@/lib/format";
import type { Order, Profile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const admin = createAdminClient();
  const [{ data: orders }, { data: profiles }] = await Promise.all([
    admin.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("profiles").select("id,email,name"),
  ]);

  const map = new Map<string, Pick<Profile, "email" | "name">>();
  for (const p of (profiles ?? []) as Profile[]) map.set(p.id, { email: p.email, name: p.name });
  const list = (orders ?? []) as Order[];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="display text-[2rem] leading-none">Pedidos</h1>
        <p className="mt-1 text-sm text-fg-muted">{list.length} pedidos (mais recentes).</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-subtle">
              <th className="px-4 py-3 font-medium">Pedido</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Serviço</th>
              <th className="px-4 py-3 font-medium">Qtd</th>
              <th className="px-4 py-3 font-medium">Preço</th>
              <th className="px-4 py-3 font-medium">Custo</th>
              <th className="px-4 py-3 font-medium">Lucro</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((o) => (
              <tr key={o.id} className="hover:bg-surface-2">
                <td className="px-4 py-3 font-mono text-xs text-fg-muted">{o.public_order_id}</td>
                <td className="px-4 py-3 text-xs text-fg-muted">
                  {map.get(o.user_id)?.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-fg">{o.service_name ?? "—"}</td>
                <td className="px-4 py-3 text-fg-muted">{formatNumber(o.quantity)}</td>
                <td className="px-4 py-3 font-medium text-fg">{formatBRL(o.customer_price)}</td>
                <td className="px-4 py-3 text-fg-muted">{formatBRL(o.provider_cost)}</td>
                <td className="px-4 py-3 font-medium text-success">{formatBRL(o.profit)}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3 text-xs text-fg-subtle">{formatDateTime(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
