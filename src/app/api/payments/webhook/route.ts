import { NextResponse } from "next/server";
import { getActiveGateway } from "@/lib/payments";
import { approvePaymentByExternalId } from "@/lib/payments/approve";

/**
 * Webhook do gateway real (Asaas / Mercado Pago / etc).
 * O gateway valida a assinatura em parseWebhook(). Só credita saldo aqui.
 */
export async function POST(request: Request) {
  const { gateway, creds } = await getActiveGateway();

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const parsed = await gateway.parseWebhook(payload, request.headers, creds);
  if (!parsed) {
    // assinatura inválida ou gateway sem webhook (mock)
    return NextResponse.json({ received: true }, { status: 200 });
  }

  if (parsed.approved) {
    await approvePaymentByExternalId(parsed.externalId);
  }

  return NextResponse.json({ received: true });
}
