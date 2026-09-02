import "server-only";
import type { PaymentGateway, CreatePixInput, PixCharge } from "./types";

/**
 * Gateway PIX MOCK — fallback de desenvolvimento.
 * Gera um "copia-e-cola" fictício. A aprovação é simulada pelo endpoint
 * /api/payments/[id]/confirm (que substitui o webhook em dev).
 * NÃO usar em produção — trocar por Asaas (PAYMENT_PROVIDER=asaas).
 */
export const mockGateway: PaymentGateway = {
  id: "mock",
  label: "PIX (simulado)",

  isConfigured() {
    return true;
  },

  async createPix(input: CreatePixInput): Promise<PixCharge> {
    const externalId = `mock_${crypto.randomUUID()}`;
    const payload =
      `00020126BR.GOV.BCB.PIX-SEGUIDORX-${externalId}` +
      `520400005303986540${input.amount.toFixed(2)}5802BR5909SeguidorX6009SAO PAULO`;
    return {
      externalId,
      qrCode: payload,
      qrCodeBase64: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  },

  async parseWebhook() {
    // Mock não recebe webhook real.
    return null;
  },
};
