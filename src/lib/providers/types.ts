/** Contrato genérico de fornecedor — permite adicionar novos fornecedores depois. */

export interface NormalizedService {
  providerServiceId: string;
  name: string;
  type: string;
  category: string;
  /** taxa crua da API (geralmente por 1000, em USD) */
  rate: number;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  raw: Record<string, unknown>;
}

export interface ProviderBalance {
  balance: number;
  currency: string;
}

export interface CreateOrderInput {
  serviceId: string;
  link: string;
  quantity: number;
}

export interface ProviderStatus {
  charge: number | null;
  startCount: number | null;
  status: string | null; // status cru do fornecedor
  remains: number | null;
  currency: string | null;
}

export interface Provider {
  id: string;
  label: string;
  isConfigured(): boolean;
  getServices(): Promise<NormalizedService[]>;
  getBalance(): Promise<ProviderBalance>;
  createOrder(input: CreateOrderInput): Promise<{ orderId: string }>;
  getOrderStatus(orderId: string): Promise<ProviderStatus>;
  getMultipleOrderStatus(
    orderIds: string[]
  ): Promise<Record<string, ProviderStatus>>;
  createRefill(orderId: string): Promise<{ refillId: string }>;
  getRefillStatus(refillId: string): Promise<{ status: string }>;
  cancelOrders(orderIds: string[]): Promise<unknown>;
}

/** Erro tipado para falhas de fornecedor. */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly action?: string,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
