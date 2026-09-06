import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

/**
 * Credenciais do fornecedor: banco (provider_settings) com fallback para o env.
 * Só o backend (service role) lê a tabela — a chave nunca vai ao client.
 */

const DEFAULT_URL = "https://baratosociais.com/api/v2";

export interface ProviderRow {
  id: string;
  api_key: string | null;
  api_url: string | null;
  connected: boolean;
  account_label: string | null;
  updated_at?: string;
}

export async function getProviderRow(id: string): Promise<ProviderRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("provider_settings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as ProviderRow) ?? null;
}

/** Chave + URL efetivas (banco tem prioridade sobre o env). */
export async function loadProviderCreds(
  id: string
): Promise<{ key: string; url: string; source: "painel" | "env" | null }> {
  const row = await getProviderRow(id);
  const key = row?.api_key || serverEnv.baratoSociaisKey;
  const url = row?.api_url || serverEnv.baratoSociaisUrl || DEFAULT_URL;
  const source = row?.api_key ? "painel" : serverEnv.baratoSociaisKey ? "env" : null;
  return { key, url, source };
}

export async function isProviderConfiguredDb(id: string): Promise<boolean> {
  const { key } = await loadProviderCreds(id);
  return Boolean(key);
}
