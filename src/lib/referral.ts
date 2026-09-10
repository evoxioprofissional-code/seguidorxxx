import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeReferralCode } from "@/lib/referral-code";

export async function claimReferralByCode(
  userId: string,
  rawCode: string | null | undefined
): Promise<boolean> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return false;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_referral", {
    p_user_id: userId,
    p_referral_code: code,
  });

  if (error) throw new Error(`Falha ao vincular indicação: ${error.message}`);
  return Boolean(data);
}

/**
 * Paga a comissão de indicação para quem indicou o dono do depósito.
 * Chamado na aprovação do pagamento. Idempotente por pagamento.
 * O indicador ganha X% do valor depositado (configurável no admin).
 */
export async function payReferralCommission(paymentId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("process_referral_commission", {
    p_payment_id: paymentId,
  });

  if (error) throw new Error(`Falha ao processar comissão: ${error.message}`);
}
