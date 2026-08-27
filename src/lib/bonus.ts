import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/providers";
import { calculateProviderCost } from "@/lib/pricing";
import type { Order, Service } from "@/types/database";

interface BonusTier {
  min: number;
  followers: number;
}

/**
 * Concede o bônus por depósito (idempotente por payment_id).
 * Chamado quando um pagamento é aprovado. Cria um bonus_grant 'pending'
 * que o cliente resgata informando o @ do Instagram.
 */
export async function grantDepositBonus(paymentId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: settings } = await admin
    .from("app_settings")
    .select("key,value")
    .in("key", ["bonus_enabled", "deposit_bonuses", "bonus_service_id"]);
  const map = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));

  if (map.bonus_enabled === false) return;
  const tiers = (Array.isArray(map.deposit_bonuses) ? map.deposit_bonuses : []) as BonusTier[];
  const serviceId = typeof map.bonus_service_id === "string" ? map.bonus_service_id : null;
  if (!serviceId || tiers.length === 0) return;

  const { data: payment } = await admin
    .from("payments")
    .select("id,user_id,amount")
    .eq("id", paymentId)
    .single();
  if (!payment) return;

  // maior faixa que o valor alcança
  const amount = Number(payment.amount);
  const tier = tiers
    .filter((t) => amount >= Number(t.min))
    .sort((a, b) => Number(b.min) - Number(a.min))[0];
  if (!tier) return;

  // idempotente: 1 bônus por pagamento
  await admin.from("bonus_grants").insert({
    user_id: payment.user_id,
    followers: Number(tier.followers),
    service_id: serviceId,
    payment_id: payment.id,
    status: "pending",
  });
  // se já existia (payment_id unique), o insert falha silenciosamente — ok
}

export type ClaimResult =
  | { ok: true; orderId: string }
  | { ok: false; message: string };

/**
 * Resgata um bônus: cria um pedido GRÁTIS (customer_price = 0) e envia ao fornecedor.
 * O custo do fornecedor é absorvido pela casa (marketing).
 */
export async function claimBonus(
  userId: string,
  bonusId: string,
  link: string
): Promise<ClaimResult> {
  const admin = createAdminClient();

  const { data: bonus } = await admin
    .from("bonus_grants")
    .select("*")
    .eq("id", bonusId)
    .eq("user_id", userId)
    .single();
  if (!bonus) return { ok: false, message: "Bônus não encontrado." };
  if (bonus.status === "delivered")
    return { ok: false, message: "Este bônus já foi resgatado." };
  if (!bonus.service_id) return { ok: false, message: "Bônus indisponível no momento." };

  const { data: service } = await admin
    .from("services")
    .select("*")
    .eq("id", bonus.service_id)
    .single<Service>();
  if (!service) return { ok: false, message: "Serviço do bônus indisponível." };

  const qty = Math.min(Math.max(bonus.followers, service.min_quantity), service.max_quantity);
  const providerCost = calculateProviderCost(service.provider_cost, qty);

  // cria o pedido grátis (reserva o resgate antes de chamar o fornecedor)
  const { data: created, error: insErr } = await admin
    .from("orders")
    .insert({
      user_id: userId,
      service_id: service.id,
      provider: service.provider,
      link,
      quantity: qty,
      customer_price: 0,
      provider_cost: providerCost,
      profit: -providerCost,
      status: "submitting",
      service_name: `Bônus — ${service.custom_name ?? "Seguidores"}`,
      source: "bonus",
      has_refill: service.has_refill,
      has_cancel: service.has_cancel,
    })
    .select("*")
    .single<Order>();
  if (insErr || !created) return { ok: false, message: "Não foi possível criar o pedido." };

  // marca o bônus como resgatado apontando pro pedido
  await admin
    .from("bonus_grants")
    .update({ status: "delivered", link, order_id: created.id, delivered_at: new Date().toISOString() })
    .eq("id", bonusId);

  // envia ao fornecedor
  try {
    const provider = getProvider(service.provider);
    const { orderId } = await provider.createOrder({
      serviceId: service.provider_service_id,
      link,
      quantity: qty,
    });
    await admin
      .from("orders")
      .update({ provider_order_id: orderId, status: "processing", provider_status: "In progress" })
      .eq("id", created.id);
  } catch {
    // falha no fornecedor: deixa o pedido 'failed' e libera o bônus pra tentar de novo
    await admin.from("orders").update({ status: "failed" }).eq("id", created.id);
    await admin
      .from("bonus_grants")
      .update({ status: "pending", order_id: null, delivered_at: null })
      .eq("id", bonusId);
    return { ok: false, message: "Falha ao enviar o bônus. Tente novamente em instantes." };
  }

  return { ok: true, orderId: created.id };
}
