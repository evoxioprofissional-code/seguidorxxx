import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiKey } from "@/types/database";

/** Gera uma API key opaca de 32 bytes (hex). */
export function generateKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Valida uma key e retorna o dono (user_id) ou null. Atualiza last_used_at. */
export async function resolveApiKey(
  key: string
): Promise<{ userId: string; keyId: string } | null> {
  if (!key || key.length < 16) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("api_keys")
    .select("id,user_id,active")
    .eq("key", key)
    .eq("active", true)
    .single<Pick<ApiKey, "id" | "user_id" | "active">>();
  if (!data) return null;

  // best-effort: marca uso
  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return { userId: data.user_id, keyId: data.id };
}
