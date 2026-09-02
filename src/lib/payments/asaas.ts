import "server-only";
import { serverEnv } from "@/lib/env";
import type { PaymentGateway, CreatePixInput, PixCharge } from "./types";

/**
 * Gateway Asaas — PIX via API de cobranças (/v3).
 *
 * Fluxo: cria (ou reaproveita) um cliente -> cria uma cobrança billingType=PIX ->
 * busca o QR Code (copia-e-cola + imagem base64).
 *
 * Credenciais/URL:
 *  - ASAAS_API_KEY   -> header `access_token`
 *  - ASAAS_ENV       -> "production" (padrão) ou "sandbox"
 *  - ASAAS_API_URL   -> opcional, sobrescreve a URL base
 *
 * O webhook (/api/payments/webhook) é validado pelo header `asaas-access-token`
 * comparado com PAYMENT_WEBHOOK_SECRET.
 */

function baseUrl(): string {
  if (serverEnv.asaasApiUrl) return serverEnv.asaasApiUrl.replace(/\/+$/, "");
  return serverEnv.asaasEnv === "sandbox"
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3";
}

function onlyDigits(v: string): string {
  return (v || "").replace(/\D/g, "");
}

type AsaasError = { errors?: { code?: string; description?: string }[] };

function asaasErrorMessage(data: AsaasError, fallback: string): string {
  return data?.errors?.[0]?.description || fallback;
}

async function asaasFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      access_token: serverEnv.asaasKey,
      "Content-Type": "application/json",
      // Asaas pode bloquear requisições sem User-Agent.
      "User-Agent": "SeguidorX",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export const asaasGateway: PaymentGateway = {
  id: "asaas",
  label: "Asaas (PIX)",

  isConfigured() {
    return Boolean(serverEnv.asaasKey);
  },

  async createPix(input: CreatePixInput): Promise<PixCharge> {
    if (!serverEnv.asaasKey) throw new Error("Asaas não configurado.");

    // 1) Cliente — reaproveita se já existir; senão cria (exige CPF/CNPJ).
    let customerId = input.asaasCustomerId || null;
    if (!customerId) {
      const cpfCnpj = onlyDigits(input.payerCpfCnpj || "");
      if (!cpfCnpj) throw new Error("CPF/CNPJ é obrigatório para gerar o PIX.");

      const res = await asaasFetch("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: input.payerName || input.payerEmail || "Cliente SeguidorX",
          cpfCnpj,
          email: input.payerEmail,
          externalReference: input.userId,
          notificationDisabled: true,
        }),
      });
      const data = (await res.json()) as AsaasError & { id?: string };
      if (!res.ok || !data.id) {
        throw new Error(
          `Asaas (cliente): ${asaasErrorMessage(data, "falha ao criar cliente")} (HTTP ${res.status})`
        );
      }
      customerId = data.id;
    }

    // 2) Cobrança PIX (vencimento hoje).
    const dueDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const payRes = await asaasFetch("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: "PIX",
        value: Number(input.amount.toFixed(2)),
        dueDate,
        description: input.description || "Recarga de saldo — SeguidorX",
        externalReference: input.userId,
      }),
    });
    const payData = (await payRes.json()) as AsaasError & {
      id?: string;
      dueDate?: string;
    };
    if (!payRes.ok || !payData.id) {
      throw new Error(
        `Asaas (cobrança): ${asaasErrorMessage(payData, "falha ao criar cobrança")} (HTTP ${payRes.status})`
      );
    }

    // 3) QR Code PIX (copia-e-cola + imagem base64).
    const qrRes = await asaasFetch(`/payments/${payData.id}/pixQrCode`, {
      method: "GET",
    });
    const qrData = (await qrRes.json()) as {
      payload?: string;
      encodedImage?: string;
      expirationDate?: string;
    };
    if (!qrRes.ok || !qrData.payload) {
      throw new Error(`Asaas (QR Code): falha ao obter o PIX (HTTP ${qrRes.status})`);
    }

    return {
      externalId: String(payData.id),
      qrCode: qrData.payload,
      qrCodeBase64: qrData.encodedImage || null,
      expiresAt:
        qrData.expirationDate ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      customerId,
    };
  },

  async parseWebhook(
    payload: unknown,
    headers: Headers
  ): Promise<{ externalId: string; approved: boolean } | null> {
    // Validação do webhook: token configurado no painel do Asaas.
    const secret = serverEnv.paymentWebhookSecret;
    if (secret) {
      const token = headers.get("asaas-access-token") || "";
      if (token !== secret) return null; // requisição não autêntica -> ignora
    }

    const body = (payload ?? {}) as {
      event?: string;
      payment?: { id?: string | number; status?: string };
    };

    const paymentId = body.payment?.id != null ? String(body.payment.id) : null;
    if (!paymentId) return null;

    const PAID_EVENTS = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"];
    const PAID_STATUSES = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
    const approved =
      (body.event ? PAID_EVENTS.includes(body.event) : false) ||
      (body.payment?.status ? PAID_STATUSES.includes(body.payment.status) : false);

    return { externalId: paymentId, approved };
  },
};
