import "server-only";
import { serverEnv } from "@/lib/env";
import { logProvider } from "./logger";
import {
  Provider,
  ProviderBalance,
  ProviderError,
  ProviderStatus,
  NormalizedService,
  CreateOrderInput,
} from "./types";

const PROVIDER_ID = "barato_sociais";

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Faz uma chamada POST x-www-form-urlencoded à API v2. A KEY nunca vaza. */
async function call(
  action: string,
  params: Record<string, string | number> = {}
): Promise<unknown> {
  if (!serverEnv.baratoSociaisKey) {
    throw new ProviderError("API não configurada", action);
  }

  const body = new URLSearchParams();
  body.set("key", serverEnv.baratoSociaisKey);
  body.set("action", action);
  for (const [k, v] of Object.entries(params)) body.set(k, String(v));

  // request logado sem a key (o URLSearchParams inclui a key; recriamos sem ela)
  const safeRequest = { action, ...params };

  let response: Response;
  try {
    response = await fetch(serverEnv.baratoSociaisUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });
  } catch (err) {
    await logProvider({
      provider: PROVIDER_ID,
      action,
      request: safeRequest,
      success: false,
      error: err instanceof Error ? err.message : "network error",
    });
    throw new ProviderError("Falha de rede ao contatar fornecedor", action, err);
  }

  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    await logProvider({
      provider: PROVIDER_ID,
      action,
      request: safeRequest,
      response: text.slice(0, 1000),
      success: false,
      error: `Resposta inválida (HTTP ${response.status})`,
    });
    throw new ProviderError("Resposta inválida do fornecedor", action, text);
  }

  const errObj = json as { error?: string };
  const success = !(errObj && typeof errObj === "object" && "error" in errObj && errObj.error);

  await logProvider({
    provider: PROVIDER_ID,
    action,
    request: safeRequest,
    response: json,
    success,
    error: success ? undefined : String(errObj.error),
  });

  if (!success) {
    throw new ProviderError(String(errObj.error), action, json);
  }
  return json;
}

export const baratoSociais: Provider = {
  id: PROVIDER_ID,
  label: "Barato Sociais",

  isConfigured() {
    return Boolean(serverEnv.baratoSociaisKey);
  },

  async getServices(): Promise<NormalizedService[]> {
    const data = (await call("services")) as Array<Record<string, unknown>>;
    if (!Array.isArray(data)) return [];
    return data.map((s) => ({
      providerServiceId: String(s.service),
      name: String(s.name ?? ""),
      type: String(s.type ?? "Default"),
      category: String(s.category ?? "Outros"),
      rate: num(s.rate) ?? 0,
      min: num(s.min) ?? 0,
      max: num(s.max) ?? 0,
      refill: s.refill === true || s.refill === "true",
      cancel: s.cancel === true || s.cancel === "true",
      raw: s,
    }));
  },

  async getBalance(): Promise<ProviderBalance> {
    const data = (await call("balance")) as { balance?: unknown; currency?: unknown };
    return {
      balance: num(data.balance) ?? 0,
      currency: String(data.currency ?? "USD"),
    };
  },

  async createOrder({ serviceId, link, quantity }: CreateOrderInput): Promise<{
    orderId: string;
  }> {
    const data = (await call("add", {
      service: serviceId,
      link,
      quantity,
    })) as { order?: unknown };
    if (!data.order) {
      throw new ProviderError("Fornecedor não retornou id do pedido", "add", data);
    }
    return { orderId: String(data.order) };
  },

  async getOrderStatus(orderId: string): Promise<ProviderStatus> {
    const data = (await call("status", { order: orderId })) as Record<string, unknown>;
    return {
      charge: num(data.charge),
      startCount: num(data.start_count),
      status: data.status != null ? String(data.status) : null,
      remains: num(data.remains),
      currency: data.currency != null ? String(data.currency) : null,
    };
  },

  async getMultipleOrderStatus(
    orderIds: string[]
  ): Promise<Record<string, ProviderStatus>> {
    if (orderIds.length === 0) return {};
    // A API aceita até 100 pedidos por chamada.
    const out: Record<string, ProviderStatus> = {};
    for (let i = 0; i < orderIds.length; i += 100) {
      const chunk = orderIds.slice(i, i + 100);
      const data = (await call("status", { orders: chunk.join(",") })) as Record<
        string,
        Record<string, unknown>
      >;
      for (const [id, s] of Object.entries(data)) {
        if (!s || typeof s !== "object") continue;
        out[id] = {
          charge: num(s.charge),
          startCount: num(s.start_count),
          status: s.status != null ? String(s.status) : null,
          remains: num(s.remains),
          currency: s.currency != null ? String(s.currency) : null,
        };
      }
    }
    return out;
  },

  async createRefill(orderId: string): Promise<{ refillId: string }> {
    const data = (await call("refill", { order: orderId })) as { refill?: unknown };
    return { refillId: String(data.refill ?? "") };
  },

  async getRefillStatus(refillId: string): Promise<{ status: string }> {
    const data = (await call("refill_status", { refill: refillId })) as {
      status?: unknown;
    };
    return { status: String(data.status ?? "Pending") };
  },

  async cancelOrders(orderIds: string[]): Promise<unknown> {
    return call("cancel", { orders: orderIds.join(",") });
  },
};
