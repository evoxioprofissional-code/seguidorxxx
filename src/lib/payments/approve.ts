import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Aprova um pagamento e credita o saldo — de forma idempotente.
 * Chamado apenas pelo backend (webhook real ou confirmação mock).
 * O saldo NUNCA é creditado a partir do frontend.
 */
export async function approvePaymentByExternalId(
  externalId: string
): Promise<{ ok: boolean; reason?: string }> {
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("external_payment_id", externalId)
    .single();

  if (!payment) return { ok: false, reason: "not_found" };
  if (payment.status === "approved") {
    try {
      const { payReferralCommission } = await import("@/lib/referral");
      await payReferralCommission(payment.id);
      return { ok: true };
    } catch (error) {
      console.error("[referral] retry de comissão falhou:", error);
      return { ok: false, reason: "referral_failed" };
    }
  }

  // credita saldo (RPC idempotente por reference_id + type=deposit)
  const { error: creditErr } = await admin.rpc("credit_balance", {
    p_user_id: payment.user_id,
    p_amount: Number(payment.amount),
    p_type: "deposit",
    p_description: "Depósito via PIX",
    p_reference_id: payment.id,
  });
  if (creditErr) return { ok: false, reason: creditErr.message };

  const { error: paymentUpdateError } = await admin
    .from("payments")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", payment.id);
  if (paymentUpdateError) return { ok: false, reason: paymentUpdateError.message };

  // bônus por depósito (grátis seguidores). best-effort, não bloqueia o crédito.
  try {
    const { grantDepositBonus } = await import("@/lib/bonus");
    await grantDepositBonus(payment.id);
  } catch {
    /* bônus é best-effort */
  }

  // Comissão é financeira: falhas precisam provocar retry do webhook.
  try {
    const { payReferralCommission } = await import("@/lib/referral");
    await payReferralCommission(payment.id);
  } catch (error) {
    console.error("[referral] comissão falhou:", error);
    return { ok: false, reason: "referral_failed" };
  }

  return { ok: true };
}
