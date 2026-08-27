import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Saldo da carteira do usuário logado (0 se não houver). */
export async function getBalance(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", user.id)
    .single();
  return Number(data?.balance ?? 0);
}

/** Configuração pública (settings) — cacheada por request. */
export async function getSettings(): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key,value");
  const out: Record<string, unknown> = {};
  for (const row of data ?? []) out[row.key] = row.value;
  return out;
}
