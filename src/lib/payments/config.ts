import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { registry, mockGateway } from "./registry";
import type { GatewayCredentials, PaymentGateway } from "./types";

/**
 * Configuração de pagamentos armazenada no banco:
 *  - app_settings.payment_provider -> qual gateway está ativo (não secreto)
 *  - payment_gateways               -> credenciais (secretas; só service role lê)
 *
 * Se não houver linha no banco, cai no fallback das variáveis de ambiente, então
 * a troca de env->banco é transparente e nada quebra durante a transição.
 */

export interface GatewayRow {
  id: string;
  api_key: string | null;
  webhook_secret: string | null;
  extra: Record<string, unknown> | null;
  connected: boolean;
  account_label: string | null;
  updated_at?: string;
}

const ACTIVE_KEY = "payment_provider";

/** Credenciais vindas do env (fallback), por gateway. */
function envCreds(id: string): GatewayCredentials {
  if (id === "asaas")
    return {
      apiKey: serverEnv.asaasKey,
      webhookSecret: serverEnv.paymentWebhookSecret,
      env: serverEnv.asaasEnv,
      apiUrl: serverEnv.asaasApiUrl,
    };
  if (id === "mercadopago")
    return {
      apiKey: serverEnv.mercadoPagoToken,
      webhookSecret: serverEnv.mercadoPagoWebhookSecret,
    };
  return {};
}

/** Combina a linha do banco com o fallback do env (banco tem prioridade). */
export function credsFromRow(id: string, row: GatewayRow | null): GatewayCredentials {
  const env = envCreds(id);
  const extra = (row?.extra ?? {}) as { env?: string; apiUrl?: string };
  return {
    apiKey: row?.api_key || env.apiKey,
    webhookSecret: row?.webhook_secret || env.webhookSecret,
    env: extra.env || env.env,
    apiUrl: extra.apiUrl || env.apiUrl,
  };
}

export async function getGatewayRow(id: string): Promise<GatewayRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("payment_gateways")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as GatewayRow) ?? null;
}

export async function getActiveProviderId(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", ACTIVE_KEY)
    .maybeSingle();
  const v = data?.value;
  const fromDb = typeof v === "string" ? v : null;
  return fromDb || serverEnv.paymentProvider || "mock";
}

export async function setActiveProviderId(id: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("app_settings").upsert(
    { key: ACTIVE_KEY, value: id as never, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  );
}

export async function loadPaymentConfig(): Promise<{
  providerId: string;
  creds: GatewayCredentials;
}> {
  const providerId = await getActiveProviderId();
  const row = providerId === "mock" ? null : await getGatewayRow(providerId);
  return { providerId, creds: credsFromRow(providerId, row) };
}

export async function getActiveGateway(): Promise<{
  gateway: PaymentGateway;
  creds: GatewayCredentials;
  providerId: string;
}> {
  const { providerId, creds } = await loadPaymentConfig();
  const gateway = registry[providerId] ?? mockGateway;
  return { gateway, creds, providerId };
}

export async function isMockActive(): Promise<boolean> {
  return (await getActiveProviderId()) === "mock";
}
