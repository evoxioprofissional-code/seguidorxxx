import { NextResponse } from "next/server";
import { getActiveGateway } from "@/lib/payments";
import { approvePaymentByExternalId } from "@/lib/payments/approve";

/**
 * Webhook do gateway real (Asaas / Mercado Pago / etc).
 * O gateway valida a assinatura em parseWebhook(). Só credita saldo aqui.
 */
export async function POST(request: Request) {
  const { gateway, creds, providerId } = await getActiveGateway();

  if (providerId !== "mock" && !creds.webhookSecret) {
    console.error("[payments] webhook sem segredo configurado", { providerId });
    return NextResponse.json({ received: false }, { status: 500 });
  }

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
    const result = await approvePaymentByExternalId(parsed.externalId);
    if (!result.ok) {
      console.error("[payments] aprovação incompleta:", {
        externalId: parsed.externalId,
        reason: result.reason,
      });
      return NextResponse.json({ received: false }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
