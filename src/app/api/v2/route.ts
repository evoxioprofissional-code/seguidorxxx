import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveApiKey } from "@/lib/api-keys";
import { createOrder } from "@/lib/orders/create";
import { getProvider } from "@/lib/providers";
import { ProviderError } from "@/lib/providers/types";
import { resellerPricePer1000 } from "@/lib/pricing";
import { platformLabel, categoryLabel } from "@/lib/catalog/taxonomy";
import { rateLimit } from "@/lib/rate-limit";
import type { Order, Service } from "@/types/database";

/**
 * API pública de REVENDA — padrão SMM v2.
 * POST application/x-www-form-urlencoded (ou JSON). Resposta JSON.
 * Autentica por `key`. Revendedores integram como fazem com qualquer painel.
 */

const err = (message: string, status = 200) =>
  NextResponse.json({ error: message }, { status });

// status interno -> rótulo padrão do mercado
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  submitting: "Pending",
  processing: "In progress",
  completed: "Completed",
  partial: "Partial",
  canceled: "Canceled",
  failed: "Canceled",
  refunded: "Refunded",
};

function orderNumber(publicId: string): number {
  return Number(String(publicId).replace(/[^0-9]/g, ""));
}

async function parseBody(request: Request): Promise<Record<string, string>> {
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      const j = (await request.json()) as Record<string, unknown>;
      return Object.fromEntries(Object.entries(j).map(([k, v]) => [k, String(v)]));
    } catch {
      return {};
    }
  }
  const text = await request.text();
  return Object.fromEntries(new URLSearchParams(text));
}

export async function POST(request: Request) {
  const params = await parseBody(request);
  const key = params.key ?? "";
  const action = params.action ?? "";

  const auth = await resolveApiKey(key);
  if (!auth) return err("Invalid API key");

  if (!rateLimit(`apiv2:${auth.userId}`, 60, 60_000).ok)
    return err("Rate limit exceeded");

  const admin = createAdminClient();

  switch (action) {
    // ---------------------------------------------------------------- services
    case "services": {
      const { data: settings } = await admin
        .from("app_settings")
        .select("value")
        .eq("key", "reseller_discount_percentage")
        .single();
      const discount = Number(settings?.value ?? 0);

      const { data } = await admin
        .from("services")
        .select("*")
        .eq("active", true)
        .order("code", { ascending: true });

      const list = ((data ?? []) as Service[])
        .filter((s) => !s.pricing_warning)
        .map((s) => ({
          service: s.code,
          name: s.custom_name || `${categoryLabel(s.category)} ${platformLabel(s.platform)}`,
          type: "Default",
          category: `${platformLabel(s.platform)}`,
          rate: resellerPricePer1000(s, discount).toFixed(2),
          min: String(s.min_quantity),
          max: String(s.max_quantity),
          refill: s.has_refill,
          cancel: s.has_cancel,
        }));
      return NextResponse.json(list);
    }

    // ----------------------------------------------------------------- balance
    case "balance": {
      const { data } = await admin
        .from("wallets")
        .select("balance")
        .eq("user_id", auth.userId)
        .single();
      return NextResponse.json({
        balance: Number(data?.balance ?? 0).toFixed(2),
        currency: "BRL",
      });
    }

    // --------------------------------------------------------------------- add
    case "add": {
      const code = Number(params.service);
      const link = params.link ?? "";
      const quantity = Number(params.quantity);
      if (!code || !link || !quantity) return err("Missing parameters");

      const { data: service } = await admin
        .from("services")
        .select("id")
        .eq("code", code)
        .eq("active", true)
        .single<Pick<Service, "id">>();
      if (!service) return err("Service not found");

      const { data: settings } = await admin
        .from("app_settings")
        .select("value")
        .eq("key", "reseller_discount_percentage")
        .single();
      const discount = Number(settings?.value ?? 0);

      const result = await createOrder({
        userId: auth.userId,
        serviceId: service.id,
        link,
        quantity,
        idempotencyKey: crypto.randomUUID(),
        source: "api",
        resellerDiscountPct: discount,
      });

      if (!result.ok) {
        const map: Record<string, string> = {
          INSUFFICIENT_BALANCE: "Not enough funds",
          QTY_MIN: "Quantity below minimum",
          QTY_MAX: "Quantity above maximum",
          SERVICE_INACTIVE: "Service not available",
          SERVICE_NOT_FOUND: "Service not found",
        };
        return err(map[result.code] ?? result.message);
      }
      return NextResponse.json({ order: orderNumber(result.order.public_order_id) });
    }

    // ------------------------------------------------------------------ status
    case "status": {
      const single = params.order;
      const multi = params.orders;

      const nums = (multi ?? single ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));
      if (nums.length === 0) return err("Missing order");

      const publicIds = nums.map((n) => `SX-${n}`);
      const { data } = await admin
        .from("orders")
        .select("*")
        .eq("user_id", auth.userId)
        .in("public_order_id", publicIds);

      const orders = (data ?? []) as Order[];
      const byNum = new Map(orders.map((o) => [orderNumber(o.public_order_id), o]));

      const shape = (o: Order) => ({
        charge: Number(o.customer_price).toFixed(2),
        start_count: o.start_count != null ? String(o.start_count) : "0",
        status: STATUS_LABEL[o.status] ?? "In progress",
        remains: o.remains != null ? String(o.remains) : "0",
        currency: "BRL",
      });

      if (single && !multi) {
        const o = byNum.get(nums[0]);
        if (!o) return err("Order not found");
        return NextResponse.json(shape(o));
      }

      const out: Record<string, unknown> = {};
      for (const n of nums) {
        const o = byNum.get(n);
        out[n] = o ? shape(o) : { error: "Order not found" };
      }
      return NextResponse.json(out);
    }

    // ------------------------------------------------------------------ refill
    case "refill": {
      const num = Number(params.order);
      if (!num) return err("Missing order");
      const { data: o } = await admin
        .from("orders")
        .select("*")
        .eq("user_id", auth.userId)
        .eq("public_order_id", `SX-${num}`)
        .single<Order>();
      if (!o) return err("Order not found");
      if (!o.has_refill || !o.provider_order_id) return err("Refill not available");
      try {
        const provider = getProvider(o.provider);
        const { refillId } = await provider.createRefill(o.provider_order_id);
        await admin.from("order_refills").insert({
          order_id: o.id,
          provider_refill_id: refillId,
          status: "pending",
        });
        return NextResponse.json({ refill: refillId });
      } catch (e) {
        return err(e instanceof ProviderError ? e.message : "Refill failed");
      }
    }

    // ------------------------------------------------------------------ cancel
    case "cancel": {
      const nums = (params.orders ?? params.order ?? "")
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isFinite(n));
      if (nums.length === 0) return err("Missing orders");

      const { data } = await admin
        .from("orders")
        .select("*")
        .eq("user_id", auth.userId)
        .in("public_order_id", nums.map((n) => `SX-${n}`));
      const orders = (data ?? []) as Order[];

      const out = [];
      for (const n of nums) {
        const o = orders.find((x) => orderNumber(x.public_order_id) === n);
        if (!o || !o.has_cancel || !o.provider_order_id) {
          out.push({ order: n, cancel: { error: "Cancel not available" } });
          continue;
        }
        try {
          const provider = getProvider(o.provider);
          await provider.cancelOrders([o.provider_order_id]);
          await admin.from("orders").update({ provider_status: "Cancel requested" }).eq("id", o.id);
          out.push({ order: n, cancel: 1 });
        } catch {
          out.push({ order: n, cancel: { error: "Cancel failed" } });
        }
      }
      return NextResponse.json(out);
    }

    default:
      return err("Invalid action");
  }
}
