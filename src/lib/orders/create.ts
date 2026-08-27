import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/providers";
import { ProviderError } from "@/lib/providers/types";
import { calculateProviderCost, calculateSalePrice, hasPricingWarning } from "@/lib/pricing";
import { platformLabel, categoryLabel } from "@/lib/catalog/taxonomy";
import type { Order, Service } from "@/types/database";

export type CreateOrderResult =
  | { ok: true; order: Order }
  | { ok: false; code: string; message: string };

interface Params {
  userId: string;
  serviceId: string;
  link: string;
  quantity: number;
  idempotencyKey: string;
}

/**
 * Fluxo de compra seguro:
 *  1. valida serviço/ativo/quantidade/preço NO SERVIDOR
 *  2. debita saldo + cria pedido de forma ATÔMICA (RPC com lock) -> 'submitting'
 *  3. envia ao fornecedor
 *  4. sucesso: grava provider_order_id -> 'processing'
 *     falha:   estorna automaticamente (refund_order) -> 'refunded'/'failed'
 * Idempotente pela idempotencyKey (evita cobrança duplicada em cliques/abas duplas).
 */
export async function createOrder(params: Params): Promise<CreateOrderResult> {
  const admin = createAdminClient();

  // --- checagem de manutenção / pedidos habilitados ---
  const { data: settings } = await admin
    .from("app_settings")
    .select("key,value")
    .in("key", ["orders_enabled", "maintenance_mode"]);
  const settingMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  if (settingMap.orders_enabled === false || settingMap.maintenance_mode === true) {
    return { ok: false, code: "ORDERS_DISABLED", message: "Pedidos temporariamente indisponíveis." };
  }

  // --- serviço ---
  const { data: service } = await admin
    .from("services")
    .select("*")
    .eq("id", params.serviceId)
    .single<Service>();

  if (!service) return { ok: false, code: "SERVICE_NOT_FOUND", message: "Serviço não encontrado." };
  if (!service.active) return { ok: false, code: "SERVICE_INACTIVE", message: "Serviço indisponível." };
  if (hasPricingWarning(service) || service.pricing_warning) {
    return { ok: false, code: "PRICING_WARNING", message: "Serviço temporariamente indisponível." };
  }

  // --- quantidade ---
  const qty = Math.trunc(params.quantity);
  if (qty < service.min_quantity)
    return { ok: false, code: "QTY_MIN", message: `Quantidade mínima: ${service.min_quantity}.` };
  if (qty > service.max_quantity)
    return { ok: false, code: "QTY_MAX", message: `Quantidade máxima: ${service.max_quantity}.` };

  // --- preço recalculado no servidor (NUNCA confiar no front) ---
  const customerPrice = calculateSalePrice(service, qty);
  const providerCost = calculateProviderCost(service.provider_cost, qty);
  if (customerPrice <= 0)
    return { ok: false, code: "PRICE_INVALID", message: "Preço inválido para este serviço." };
  if (customerPrice < providerCost)
    return { ok: false, code: "PRICING_WARNING", message: "Serviço temporariamente indisponível." };

  const serviceName =
    service.custom_name ||
    `${categoryLabel(service.category)} ${platformLabel(service.platform)}`;

  // --- 2. débito atômico + pedido reservado ---
  const { data: created, error: rpcErr } = await admin.rpc("create_order_and_debit", {
    p_user_id: params.userId,
    p_service_id: service.id,
    p_provider: service.provider,
    p_link: params.link,
    p_quantity: qty,
    p_customer_price: customerPrice,
    p_provider_cost: providerCost,
    p_service_name: serviceName,
    p_has_refill: service.has_refill,
    p_has_cancel: service.has_cancel,
    p_idempotency_key: params.idempotencyKey,
  });

  if (rpcErr) {
    const msg = rpcErr.message || "";
    if (msg.includes("INSUFFICIENT_BALANCE"))
      return { ok: false, code: "INSUFFICIENT_BALANCE", message: "Saldo insuficiente." };
    if (msg.includes("WALLET_NOT_FOUND"))
      return { ok: false, code: "WALLET_NOT_FOUND", message: "Carteira não encontrada." };
    return { ok: false, code: "DEBIT_FAILED", message: "Não foi possível processar o pedido." };
  }

  const order = created as unknown as Order;

  // Idempotência: se o pedido já tinha sido enviado antes, apenas retorna.
  if (order.provider_order_id && order.status !== "submitting") {
    return { ok: true, order };
  }

  // --- 3. envia ao fornecedor ---
  try {
    const provider = getProvider(service.provider);
    const { orderId } = await provider.createOrder({
      serviceId: service.provider_service_id,
      link: params.link,
      quantity: qty,
    });

    const { data: updated } = await admin
      .from("orders")
      .update({
        provider_order_id: orderId,
        status: "processing",
        provider_status: "In progress",
      })
      .eq("id", order.id)
      .select("*")
      .single<Order>();

    return { ok: true, order: (updated ?? order) as Order };
  } catch (err) {
    // --- 4. falha: estorna automaticamente ---
    const reason =
      err instanceof ProviderError
        ? `Estorno automático: ${err.message}`
        : "Estorno automático: falha ao enviar ao fornecedor";
    try {
      await admin.rpc("refund_order", { p_order_id: order.id, p_reason: reason });
    } catch {
      // se o estorno falhar, deixa em 'failed' para retry manual (saldo preservado no log)
      await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
    }
    return {
      ok: false,
      code: "PROVIDER_FAILED",
      message: "Não foi possível enviar o pedido ao sistema. Seu saldo foi estornado.",
    };
  }
}
