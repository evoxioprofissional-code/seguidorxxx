/** Contrato de gateway de pagamento — permite trocar Mercado Pago / Asaas / etc. */

export interface CreatePixInput {
  userId: string;
  amount: number;
  description?: string;
  payerEmail?: string;
}

export interface PixCharge {
  externalId: string;
  qrCode: string; // copia-e-cola
  qrCodeBase64: string | null; // imagem base64 (sem prefixo data:)
  expiresAt: string; // ISO
}

export interface PaymentGateway {
  id: string;
  label: string;
  isConfigured(): boolean;
  createPix(input: CreatePixInput): Promise<PixCharge>;
  /** Valida o webhook e devolve {externalId, approved} ou null se inválido. */
  parseWebhook(
    payload: unknown,
    headers: Headers
  ): Promise<{ externalId: string; approved: boolean } | null>;
}
