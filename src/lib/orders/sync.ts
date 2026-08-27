import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider, DEFAULT_PROVIDER } from "@/lib/providers";
import { mapProviderStatus, OPEN_STATUSES } from "@/lib/orders/status";
import type { Order, OrderStatus } from "@/types/database";

/** Sincroniza um lote de pedidos abertos com o fornecedor (em lote, até 100/req). */
export async function syncOrders(orders: Order[]): Promise<number> {
  const withProvider = orders.filter(
    (o) => o.provider_order_id && OPEN_STATUSES.includes(o.status)
  );
  if (withProvider.length === 0) return 0;

  const admin = createAdminClient();

  // agrupa por fornecedor
  const byProvider = new Map<string, Order[]>();
  for (const o of withProvider) {
    const key = o.provider || DEFAULT_PROVIDER;
    byProvider.set(key, [...(byProvider.get(key) ?? []), o]);
  }

  let updated = 0;

  for (const [providerId, group] of byProvider) {
    const provider = getProvider(providerId);
    if (!provider.isConfigured()) continue;

    const ids = group.map((o) => o.provider_order_id!) as string[];
    let statuses: Awaited<ReturnType<typeof provider.getMultipleOrderStatus>>;
    try {
      statuses = await provider.getMultipleOrderStatus(ids);
    } catch {
      continue; // falha de rede — tenta na próxima passada
    }

    for (const order of group) {
      const st = statuses[order.provider_order_id!];
      if (!st) continue;
      const mapped: OrderStatus = mapProviderStatus(st.status);
      const patch: Partial<Order> = {
        status: mapped,
        provider_status: st.status,
        start_count: st.startCount ?? order.start_count,
        remains: st.remains ?? order.remains,
      };
      if (
        (mapped === "completed" || mapped === "canceled") &&
        !order.completed_at
      ) {
        patch.completed_at = new Date().toISOString();
      }
      const { error } = await admin.from("orders").update(patch).eq("id", order.id);
      if (!error) updated += 1;

      // Cancelado pelo fornecedor (não entregou) -> estorna o cliente automaticamente.
      // refund_order é idempotente: sincronizações repetidas não estornam 2x.
      if (mapped === "canceled" && order.status !== "refunded") {
        await admin.rpc("refund_order", {
          p_order_id: order.id,
          p_reason: "Estorno automático: pedido cancelado pelo fornecedor",
        });
      }
    }
  }

  return updated;
}

/** Sincroniza um único pedido pelo id interno. Retorna o pedido atualizado. */
export async function syncOrderById(orderId: string): Promise<Order | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("orders").select("*").eq("id", orderId).single();
  if (!data) return null;
  await syncOrders([data as Order]);
  const { data: fresh } = await admin.from("orders").select("*").eq("id", orderId).single();
  return (fresh ?? data) as Order;
}
