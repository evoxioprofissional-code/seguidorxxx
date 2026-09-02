import "server-only";
import { serverEnv } from "@/lib/env";
import { mockGateway } from "./mock";
import { asaasGateway } from "./asaas";
import type { PaymentGateway } from "./types";

/**
 * Registro de gateways. Cada um implementa PaymentGateway; o resto do sistema
 * não muda ao trocar/adicionar um gateway.
 */
const registry: Record<string, PaymentGateway> = {
  [mockGateway.id]: mockGateway,
  [asaasGateway.id]: asaasGateway,
};

export function getGateway(): PaymentGateway {
  const id = serverEnv.paymentProvider || "mock";
  return registry[id] ?? mockGateway;
}

export function isMockPayments(): boolean {
  return (serverEnv.paymentProvider || "mock") === "mock";
}

export type { PaymentGateway } from "./types";
