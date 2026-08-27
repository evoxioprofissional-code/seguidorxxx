/**
 * Pricing central do SeguidorX.
 * Fonte única de verdade para custo e preço. Nunca calcular preço fora daqui.
 *
 * Convenção: `provider_cost` e `sale_price` são valores POR 1000 unidades (BRL),
 * porque painéis SMM (incl. Barato Sociais) cobram por 1000. Configurável via RATE_UNIT.
 */

import type { PricingMode, Service } from "@/types/database";

/** Unidade de cobrança do fornecedor (geralmente 1000). Configurável. */
export const RATE_UNIT = 1000;

function round(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/** Converte a taxa crua do fornecedor (USD por 1000) em custo BRL por 1000. */
export function providerCostPer1000BRL(
  providerRateUsd: number,
  usdBrlRate: number
): number {
  return round(providerRateUsd * usdBrlRate, 4);
}

/** Custo do fornecedor para uma quantidade específica (BRL). */
export function calculateProviderCost(
  providerCostPer1000: number,
  quantity: number
): number {
  return round((providerCostPer1000 * quantity) / RATE_UNIT, 4);
}

/**
 * Preço de venda POR 1000 conforme a estratégia configurada no serviço.
 * - manual: usa sale_price já definido pelo admin
 * - markup: custo * (1 + markup%/100)
 * - multiplier: custo * multiplicador
 */
type PricingInput = Pick<
  Service,
  "pricing_mode" | "sale_price" | "provider_cost" | "markup_percentage" | "multiplier"
> & { min_sale_price?: number | null };

export function computeSalePricePer1000(service: PricingInput): number {
  const mode: PricingMode = service.pricing_mode;
  const cost = Number(service.provider_cost) || 0;
  let base: number;
  switch (mode) {
    case "manual":
      base = round(Number(service.sale_price) || 0, 2);
      break;
    case "markup":
      base = round(cost * (1 + (Number(service.markup_percentage) || 0) / 100), 2);
      break;
    case "multiplier":
      base = round(cost * (Number(service.multiplier) || 1), 2);
      break;
    default:
      base = round(Number(service.sale_price) || 0, 2);
  }
  // Piso de preço: nunca vende abaixo de min_sale_price (por 1.000).
  const floor = Number(service.min_sale_price ?? 0) || 0;
  return round(Math.max(base, floor), 2);
}

/** Preço final que o cliente paga por uma quantidade (BRL, 2 casas). */
export function calculateSalePrice(service: PricingInput, quantity: number): number {
  const per1000 = computeSalePricePer1000(service);
  return round((per1000 * quantity) / RATE_UNIT, 2);
}

/** Margem percentual entre custo e venda (por 1000). */
export function marginPercentage(cost: number, sale: number): number {
  if (cost <= 0) return sale > 0 ? 100 : 0;
  return round(((sale - cost) / cost) * 100, 1);
}

/**
 * Serviço está com preço perigoso? (venda abaixo do custo, ou margem mínima
 * não atingida). Bloqueia novas compras no servidor.
 */
export function hasPricingWarning(
  service: PricingInput & Pick<Service, "minimum_margin_percentage">
): boolean {
  const cost = Number(service.provider_cost) || 0;
  const sale = computeSalePricePer1000(service);
  if (sale <= 0) return true;
  if (sale < cost) return true;
  const minMargin = Number(service.minimum_margin_percentage) || 0;
  if (minMargin > 0 && marginPercentage(cost, sale) < minMargin) return true;
  return false;
}

/** Lucro por 1000 (BRL). */
export function profitPer1000(service: PricingInput): number {
  return round(computeSalePricePer1000(service) - (Number(service.provider_cost) || 0), 2);
}
