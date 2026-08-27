import "server-only";
import crypto from "node:crypto";
import { serverEnv } from "@/lib/env";
import type { PaymentGateway, CreatePixInput, PixCharge } from "./types";

const MP_API = "https://api.mercadopago.com";

/**
 * Gateway Mercado Pago — PIX via API de Pagamentos (/v1/payments).
 * Gera QR Code + copia-e-cola e valida o webhook por assinatura (x-signature).
 * Credenciais em MERCADOPAGO_ACCESS_TOKEN e MERCADOPAGO_WEBHOOK_SECRET.
 */
export const mercadoPagoGateway: PaymentGateway = {
  id: "mercadopago",
  label: "Mercado Pago (PIX)",

  isConfigured() {
    return Boolean(serverEnv.mercadoPagoToken);
  },

  async createPix(input: CreatePixInput): Promise<PixCharge> {
    const token = serverEnv.mercadoPagoToken;
    if (!token) throw new Error("Mercado Pago não configurado.");

    const res = await fetch(`${MP_API}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: Number(input.amount),
        description: input.description || "Recarga de saldo — SeguidorX",
        payment_method_id: "pix",
        payer: { email: input.payerEmail || "comprador@seguidorx.com.br" },
      }),
      cache: "no-store",
    });

    const data = (await res.json()) as {
      id?: number | string;
      status?: string;
      date_of_expiration?: string;
      point_of_interaction?: {
        transaction_data?: { qr_code?: string; qr_code_base64?: string };
      };
      message?: string;
      cause?: unknown;
    };

    if (!res.ok || !data.id) {
      throw new Error(
        `Mercado Pago: ${data.message || "falha ao criar pagamento"} (HTTP ${res.status})`
      );
    }

    const td = data.point_of_interaction?.transaction_data;
    return {
      externalId: String(data.id),
      qrCode: td?.qr_code || "",
      qrCodeBase64: td?.qr_code_base64 || null,
      expiresAt:
        data.date_of_expiration || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  },

  async parseWebhook(
    payload: unknown,
    headers: Headers
  ): Promise<{ externalId: string; approved: boolean } | null> {
    const secret = serverEnv.mercadoPagoWebhookSecret;
    const body = (payload ?? {}) as {
      type?: string;
      action?: string;
      data?: { id?: string | number };
    };

    const paymentId = body.data?.id != null ? String(body.data.id) : null;
    const topic = body.type || body.action || "";
    if (!paymentId || !topic.includes("payment")) return null;

    // Validação de assinatura (x-signature: ts=...,v1=...)
    if (secret) {
      const sig = headers.get("x-signature") || "";
      const requestId = headers.get("x-request-id") || "";
      let ts = "";
      let v1 = "";
      for (const part of sig.split(",")) {
        const [k, v] = part.split("=");
        if (k?.trim() === "ts") ts = v?.trim() ?? "";
        if (k?.trim() === "v1") v1 = v?.trim() ?? "";
      }
      const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
      const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
      if (!v1 || expected !== v1) {
        // assinatura inválida -> ignora (não credita)
        return null;
      }
    }

    // Busca o status real do pagamento
    const token = serverEnv.mercadoPagoToken;
    try {
      const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const pay = (await res.json()) as { status?: string };
      return { externalId: paymentId, approved: pay.status === "approved" };
    } catch {
      return { externalId: paymentId, approved: false };
    }
  },
};
