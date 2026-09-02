/** Contrato de gateway de pagamento — permite trocar Asaas / outros / etc. */

export interface CreatePixInput {
  userId: string;
  amount: number;
  description?: string;
  payerEmail?: string;
  /** Nome do pagador — usado por gateways que exigem cadastro de cliente (Asaas). */
  payerName?: string;
  /** CPF ou CNPJ (só dígitos) — obrigatório no Asaas para gerar a cobrança. */
  payerCpfCnpj?: string;
  /** Id de cliente já existente no gateway, para reaproveitar (Asaas). */
  asaasCustomerId?: string | null;
}

export interface PixCharge {
  externalId: string;
  qrCode: string; // copia-e-cola
  qrCodeBase64: string | null; // imagem base64 (sem prefixo data:)
  expiresAt: string; // ISO
  /** Id do cliente no gateway (Asaas) — o backend persiste no perfil p/ reuso. */
  customerId?: string | null;
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
