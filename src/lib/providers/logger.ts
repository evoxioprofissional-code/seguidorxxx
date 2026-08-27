import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const SECRET_KEYS = ["key", "api_key", "apikey", "token", "secret", "password"];

/** Remove qualquer segredo antes de persistir logs. NUNCA salvar a API KEY. */
export function sanitize(data: unknown): unknown {
  if (data == null) return data;
  if (typeof data === "string") {
    return data.length > 4000 ? data.slice(0, 4000) + "…" : data;
  }
  if (Array.isArray(data)) return data.slice(0, 200).map(sanitize);
  if (typeof data === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (SECRET_KEYS.includes(k.toLowerCase())) {
        out[k] = "***";
      } else {
        out[k] = sanitize(v);
      }
    }
    return out;
  }
  return data;
}

export async function logProvider(entry: {
  provider: string;
  action: string;
  request?: unknown;
  response?: unknown;
  success: boolean;
  error?: string;
}) {
  try {
    const admin = createAdminClient();
    await admin.from("provider_logs").insert({
      provider: entry.provider,
      action: entry.action,
      request_data: sanitize(entry.request) as never,
      response_data: sanitize(entry.response) as never,
      success: entry.success,
      error_message: entry.error ?? null,
    });
  } catch {
    // logging é best-effort; nunca deve quebrar a operação principal
  }
}
