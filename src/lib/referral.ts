import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Paga a comissão de indicação para quem indicou o dono do depósito.
 * Chamado na aprovação do pagamento. Idempotente por pagamento.
 * O indicador ganha X% do valor depositado (configurável no admin).
 */
export async function payReferralCommission(paymentId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("id, user_id, amount")
    .eq("id", paymentId)
    .single();
  if (!payment) return;

  // quem indicou o depositante?
  const { data: depositor } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", payment.user_id)
    .single();
  const referrerId = depositor?.referred_by;
  if (!referrerId || referrerId === payment.user_id) return;

  // configurações
  const { data: settings } = await admin
    .from("app_settings")
    .select("key,value")
    .in("key", ["referral_enabled", "referral_commission_percentage", "referral_min_deposit"]);
  const map = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
  if (map.referral_enabled === false) return;

  const pct = Number(map.referral_commission_percentage ?? 0);
  const min = Number(map.referral_min_deposit ?? 0);
  if (pct <= 0) return;
  if (Number(payment.amount) < min) return;

  const commission = Math.round((Number(payment.amount) * pct) / 100 * 100) / 100;
  if (commission <= 0) return;

  const ref = `referral_${payment.id}`;

  // idempotência: não paga a mesma indicação 2x
  const { data: exists } = await admin
    .from("wallet_transactions")
    .select("id")
    .eq("reference_id", ref)
    .eq("type", "referral")
    .maybeSingle();
  if (exists) return;

  await admin.rpc("credit_balance", {
    p_user_id: referrerId,
    p_amount: commission,
    p_type: "referral",
    p_description: "Comissão de indicação",
    p_reference_id: ref,
  });
}
