import "server-only";
import { createClient } from "@/lib/supabase/server";
import { computeSalePricePer1000, hasPricingWarning } from "@/lib/pricing";
import { platformLabel, categoryLabel } from "@/lib/catalog/taxonomy";
import type { Service } from "@/types/database";

/** Faixa de velocidade definida pelo admin (IDs do fornecedor por tempo de entrega). */
export interface SpeedTier {
  label: string; // ex.: "Entrega na hora"
  rank: number; // menor = mais rápido (1 no topo)
  ids: string[]; // provider_service_id
}

/** DTO seguro — NUNCA expõe custo, lucro, fornecedor ou id do fornecedor. */
export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  platform: string;
  category: string;
  platformLabel: string;
  categoryLabel: string;
  pricePer1000: number;
  min: number;
  max: number;
  hasRefill: boolean;
  hasCancel: boolean;
  featured: boolean;
  speedLabel: string | null;
  speedRank: number; // 0 = sem faixa
}

function toPublic(s: Service, tiers: SpeedTier[]): PublicService {
  const tier = tiers.find((t) => t.ids.includes(String(s.provider_service_id)));
  return {
    id: s.id,
    name: s.custom_name || `${categoryLabel(s.category)} ${platformLabel(s.platform)}`,
    description: s.custom_description,
    platform: s.platform || "outros",
    category: s.category || "outros",
    platformLabel: platformLabel(s.platform),
    categoryLabel: categoryLabel(s.category),
    pricePer1000: computeSalePricePer1000(s),
    min: s.min_quantity,
    max: s.max_quantity,
    hasRefill: s.has_refill,
    hasCancel: s.has_cancel,
    featured: s.featured,
    speedLabel: tier?.label ?? null,
    speedRank: tier?.rank ?? 0,
  };
}

export async function getActiveServices(): Promise<PublicService[]> {
  const supabase = await createClient();
  const [{ data }, { data: tierSetting }] = await Promise.all([
    supabase.from("services").select("*").eq("active", true),
    supabase.from("app_settings").select("value").eq("key", "speed_tiers").single(),
  ]);

  const tiers = (Array.isArray(tierSetting?.value) ? tierSetting.value : []) as SpeedTier[];

  return (data ?? [])
    .map((s) => s as Service)
    .filter((s) => !hasPricingWarning(s) && !s.pricing_warning)
    .map((s) => toPublic(s, tiers))
    .sort((a, b) => {
      // 1) faixa de velocidade (mais rápida primeiro)
      const ar = a.speedRank || 999;
      const br = b.speedRank || 999;
      if (ar !== br) return ar - br;
      // 2) destaque
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      // 3) plataforma
      return a.platform.localeCompare(b.platform);
    });
}
