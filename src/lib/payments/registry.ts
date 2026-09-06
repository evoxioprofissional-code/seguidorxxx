import "server-only";
import { mockGateway } from "./mock";
import { asaasGateway } from "./asaas";
import { mercadoPagoGateway } from "./mercadopago";
import type { PaymentGateway } from "./types";

export { mockGateway };

/** Todos os gateways disponíveis, por id. */
export const registry: Record<string, PaymentGateway> = {
  [mockGateway.id]: mockGateway,
  [asaasGateway.id]: asaasGateway,
  [mercadoPagoGateway.id]: mercadoPagoGateway,
};

/** Gateways configuráveis pelo admin (exclui o mock de teste). */
export const CONFIGURABLE_GATEWAYS: PaymentGateway[] = [asaasGateway, mercadoPagoGateway];
