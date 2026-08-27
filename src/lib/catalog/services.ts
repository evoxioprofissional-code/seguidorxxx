import "server-only";
import { createClient } from "@/lib/supabase/server";
import { computeSalePricePer1000, hasPricingWarning } from "@/lib/pricing";
import { platformLabel, categoryLabel } from "@/lib/catalog/taxonomy";
import type { Service } from "@/types/database";

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
}

function toPublic(s: Service): PublicService {
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
  };
}

export async function getActiveServices(): Promise<PublicService[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("platform", { ascending: true });

  return (data ?? [])
    .map((s) => s as Service)
    .filter((s) => !hasPricingWarning(s) && !s.pricing_warning)
    .map(toPublic);
}
