import "server-only";
import crypto from "node:crypto";
import type {
  PaymentGateway,
  CreatePixInput,
  PixCharge,
  GatewayCredentials,
  GatewayTestResult,
} from "./types";

const MP_API = "https://api.mercadopago.com";

/**
 * Gateway Mercado Pago — PIX via API de Pagamentos (/v1/payments).
 * Gera QR Code + copia-e-cola e valida o webhook por assinatura (x-signature).
 * Credenciais (creds): apiKey = Access Token; webhookSecret = segredo do webhook.
 */
export const mercadoPagoGateway: PaymentGateway = {
  id: "mercadopago",
  label: "Mercado Pago (PIX)",

  isConfigured(creds) {
    return Boolean(creds.apiKey);
  },

  async createPix(input: CreatePixInput, creds: GatewayCredentials): Promise<PixCharge> {
    const token = creds.apiKey;
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
    headers: Headers,
    creds: GatewayCredentials
  ): Promise<{ externalId: string; approved: boolean } | null> {
    const secret = creds.webhookSecret;
    const body = (payload ?? {}) as {
      type?: string;
      action?: string;
      data?: { id?: string | number };
    };

    const paymentId = body.data?.id != null ? String(body.data.id) : null;
    const topic = body.type || body.action || "";
    if (!paymentId || !topic.includes("payment")) return null;
    if (!secret) return null;

    // Validação de assinatura (x-signature: ts=...,v1=...)
    {
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
        return null; // assinatura inválida -> ignora (não credita)
      }
    }

    // Busca o status real do pagamento
    try {
      const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${creds.apiKey ?? ""}` },
        cache: "no-store",
      });
      const pay = (await res.json()) as { status?: string };
      return { externalId: paymentId, approved: pay.status === "approved" };
    } catch {
      return { externalId: paymentId, approved: false };
    }
  },

  async testConnection(creds: GatewayCredentials): Promise<GatewayTestResult> {
    if (!creds.apiKey) return { ok: false, message: "Informe o Access Token." };
    try {
      const res = await fetch(`${MP_API}/users/me`, {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
        cache: "no-store",
      });
      const data = (await res.json()) as {
        nickname?: string;
        email?: string;
        site_status?: string;
      };
      if (!res.ok) {
        return { ok: false, message: `Token inválido (HTTP ${res.status}).` };
      }
      return {
        ok: true,
        accountLabel: data.nickname || data.email || "Conta Mercado Pago",
        message: "Conectado",
      };
    } catch {
      return { ok: false, message: "Falha ao conectar no Mercado Pago." };
    }
  },
};
