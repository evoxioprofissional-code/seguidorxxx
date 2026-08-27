import "server-only";
import { serverEnv } from "@/lib/env";
import { mockGateway } from "./mock";
import { mercadoPagoGateway } from "./mercadopago";
import type { PaymentGateway } from "./types";

/**
 * Registro de gateways. Adicionar Asaas/outros aqui quando integrar —
 * cada um implementa PaymentGateway; o resto do sistema não muda.
 */
const registry: Record<string, PaymentGateway> = {
  [mockGateway.id]: mockGateway,
  [mercadoPagoGateway.id]: mercadoPagoGateway,
};

export function getGateway(): PaymentGateway {
  const id = serverEnv.paymentProvider || "mock";
  return registry[id] ?? mockGateway;
}

export function isMockPayments(): boolean {
  return (serverEnv.paymentProvider || "mock") === "mock";
}

export type { PaymentGateway } from "./types";
