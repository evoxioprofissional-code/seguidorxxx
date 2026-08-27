import { NextResponse } from "next/server";
import { getGateway } from "@/lib/payments";
import { approvePaymentByExternalId } from "@/lib/payments/approve";

/**
 * Webhook do gateway real (Mercado Pago / Asaas / etc).
 * O gateway valida a assinatura em parseWebhook(). Só credita saldo aqui.
 */
export async function POST(request: Request) {
  const gateway = getGateway();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const parsed = await gateway.parseWebhook(payload, request.headers);
  if (!parsed) {
    // assinatura inválida ou gateway sem webhook (mock)
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (parsed.approved) {
    await approvePaymentByExternalId(parsed.externalId);
  }

  return NextResponse.json({ received: true });
}
