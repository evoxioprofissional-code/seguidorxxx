import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { approvePaymentByExternalId } from "@/lib/payments/approve";
import { isMockPayments } from "@/lib/payments";

/**
 * SIMULAÇÃO de aprovação de pagamento (substitui o webhook em dev/mock).
 * Só funciona com PAYMENT_PROVIDER=mock. Em produção, o crédito vem do webhook.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isMockPayments()) {
    return NextResponse.json({ error: "Indisponível." }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  // garante que o pagamento é do próprio usuário
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id,user_id,external_payment_id,status")
    .eq("id", id)
    .single();

  if (!payment || payment.user_id !== user.id)
    return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });

  const result = await approvePaymentByExternalId(payment.external_payment_id!);
  if (!result.ok)
    return NextResponse.json({ error: "Falha ao confirmar pagamento." }, { status: 400 });

  return NextResponse.json({ ok: true });
}
