/**
 * Acesso centralizado às variáveis de ambiente.
 * Server-only vars (API keys, service role) NUNCA devem vazar para o client.
 */

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

/** Só pode ser lido em código server-side. */
export const serverEnv = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  baratoSociaisUrl:
    process.env.BARATO_SOCIAIS_API_URL ?? "https://baratosociais.com/api/v2",
  baratoSociaisKey: process.env.BARATO_SOCIAIS_API_KEY ?? "",
  usdBrlRate: Number(process.env.PROVIDER_USD_BRL_RATE ?? "5.60") || 5.6,
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "mock",
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET ?? "",
  asaasKey: process.env.ASAAS_API_KEY ?? "",
  asaasEnv: (process.env.ASAAS_ENV ?? "production").toLowerCase(),
  asaasApiUrl: process.env.ASAAS_API_URL ?? "",
};

export function isProviderConfigured(): boolean {
  return Boolean(serverEnv.baratoSociaisKey);
}

export function assertSupabaseConfigured() {
  if (!publicEnv.supabaseUrl || !publicEnv.supabaseAnonKey) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
}
