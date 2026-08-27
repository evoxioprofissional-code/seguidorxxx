import Link from "next/link";
import { ListOrdered, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatBRL, formatDateTime, formatNumber } from "@/lib/format";
import type { Order } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  const orders = (data ?? []) as Order[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus pedidos</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Acompanhe o status de cada pedido em tempo real.
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ListOrdered className="h-6 w-6" />}
          title="Você ainda não fez pedidos"
          description="Comece agora e acompanhe tudo por aqui."
          action={
            <Link href="/services">
              <Button>Comprar serviço</Button>
            </Link>
          }
        />
      ) : (
        <>
          {/* Desktop: tabela */}
          <div className="card hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-subtle">
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Serviço</th>
                  <th className="px-4 py-3 font-medium">Qtd</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-2">
                    <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                      {o.public_order_id}
                    </td>
                    <td className="px-4 py-3 font-medium text-fg">
                      {o.service_name ?? "Serviço"}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{formatNumber(o.quantity)}</td>
                    <td className="px-4 py-3 font-medium text-fg">
                      {formatBRL(o.customer_price)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-subtle">
                      {formatDateTime(o.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/orders/${o.id}`}
                        className="text-primary-soft hover:underline"
                      >
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="card flex items-center justify-between p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{o.service_name ?? "Serviço"}</p>
                  <p className="mt-0.5 font-mono text-xs text-fg-subtle">{o.public_order_id}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={o.status} />
                    <span className="text-xs text-fg-muted">{formatBRL(o.customer_price)}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-fg-subtle" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
