import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider, DEFAULT_PROVIDER } from "@/lib/providers";
import { serverEnv } from "@/lib/env";
import { providerCostPer1000BRL, computeSalePricePer1000, hasPricingWarning } from "@/lib/pricing";
import { detectPlatform, detectCategory } from "@/lib/catalog/taxonomy";
import type { Service } from "@/types/database";

export interface SyncResult {
  fetched: number;
  created: number;
  updated: number;
  warnings: number;
}

/**
 * Sincroniza serviços do fornecedor.
 * - provider_services: espelho cru (sempre atualizado)
 * - services: mantém custom_name/description/sale_price/active/featured;
 *   atualiza custo, min/max, refill/cancel; recalcula pricing_warning.
 */
export async function syncServices(providerId = DEFAULT_PROVIDER): Promise<SyncResult> {
  const provider = getProvider(providerId);
  const admin = createAdminClient();
  const usdBrl = serverEnv.usdBrlRate;

  const list = await provider.getServices();
  let created = 0;
  let updated = 0;
  let warnings = 0;

  for (const s of list) {
    // 1. espelho cru
    await admin.from("provider_services").upsert(
      {
        provider: providerId,
        provider_service_id: s.providerServiceId,
        name: s.name,
        category: s.category,
        type: s.type,
        provider_rate: s.rate,
        min_quantity: s.min,
        max_quantity: s.max,
        has_refill: s.refill,
        has_cancel: s.cancel,
        raw_data: s.raw as never,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "provider,provider_service_id" }
    );

    const costPer1000 = providerCostPer1000BRL(s.rate, usdBrl);
    const platform = detectPlatform(s.category, s.name);
    const category = detectCategory(s.name, s.category);

    // 2. serviço de venda
    const { data: existing } = await admin
      .from("services")
      .select("*")
      .eq("provider", providerId)
      .eq("provider_service_id", s.providerServiceId)
      .single<Service>();

    if (!existing) {
      // novo: cria inativo, markup padrão 100%
      const draft = {
        provider: providerId,
        provider_service_id: s.providerServiceId,
        custom_name: null,
        custom_description: null,
        category,
        platform,
        provider_cost: costPer1000,
        sale_price: 0,
        pricing_mode: "markup" as const,
        markup_percentage: 100,
        multiplier: 2,
        minimum_margin_percentage: 0,
        min_quantity: s.min || 10,
        max_quantity: s.max || 100000,
        active: false,
        featured: false,
        has_refill: s.refill,
        has_cancel: s.cancel,
      };
      const warn = hasPricingWarning({ ...draft } as Service);
      await admin.from("services").insert({ ...draft, pricing_warning: warn });
      created += 1;
      if (warn) warnings += 1;
    } else {
      // atualiza apenas o que é seguro; NÃO sobrescreve custom_name/desc/sale_price/active/featured
      const merged: Service = {
        ...existing,
        provider_cost: costPer1000,
        min_quantity: s.min || existing.min_quantity,
        max_quantity: s.max || existing.max_quantity,
        has_refill: s.refill,
        has_cancel: s.cancel,
      };
      const warn = hasPricingWarning(merged);
      await admin
        .from("services")
        .update({
          provider_cost: costPer1000,
          min_quantity: s.min || existing.min_quantity,
          max_quantity: s.max || existing.max_quantity,
          has_refill: s.refill,
          has_cancel: s.cancel,
          pricing_warning: warn,
        })
        .eq("id", existing.id);
      updated += 1;
      if (warn) warnings += 1;
    }
  }

  return { fetched: list.length, created, updated, warnings };
}

/** Recalcula pricing_warning de um serviço (após edição). */
export function recomputeWarning(s: Service): boolean {
  void computeSalePricePer1000(s);
  return hasPricingWarning(s);
}
