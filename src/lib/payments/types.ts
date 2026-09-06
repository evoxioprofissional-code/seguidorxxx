/** Contrato de gateway de pagamento — Asaas / Mercado Pago / mock. */

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

/**
 * Credenciais do gateway, carregadas do banco (tabela payment_gateways) —
 * com fallback para variáveis de ambiente. NUNCA vão para o client.
 */
export interface GatewayCredentials {
  apiKey?: string;
  webhookSecret?: string;
  env?: string; // asaas: "production" | "sandbox"
  apiUrl?: string; // opcional: força a URL base
}

/** Resultado de um teste de conexão — só dados seguros de exibir no admin. */
export interface GatewayTestResult {
  ok: boolean;
  accountLabel?: string; // nome/identificação da conta
  message?: string;
}

export interface PaymentGateway {
  id: string;
  label: string;
  /** Gateways que exigem CPF/CNPJ do pagador (Asaas). */
  requiresCpf?: boolean;
  isConfigured(creds: GatewayCredentials): boolean;
  createPix(input: CreatePixInput, creds: GatewayCredentials): Promise<PixCharge>;
  /** Valida o webhook e devolve {externalId, approved} ou null se inválido. */
  parseWebhook(
    payload: unknown,
    headers: Headers,
    creds: GatewayCredentials
  ): Promise<{ externalId: string; approved: boolean } | null>;
  /** Valida as credenciais e devolve dados da conta para exibir no admin. */
  testConnection(creds: GatewayCredentials): Promise<GatewayTestResult>;
}
