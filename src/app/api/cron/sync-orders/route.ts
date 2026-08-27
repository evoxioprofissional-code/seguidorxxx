import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncOrders } from "@/lib/orders/sync";
import { OPEN_STATUSES } from "@/lib/orders/status";
import type { Order } from "@/types/database";

/**
 * Job de sincronização de pedidos abertos.
 * Proteger com header Authorization: Bearer <CRON_SECRET>.
 * Configurar no vercel.json ou chamar via cron externo. Evita polling no front.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("*")
    .in("status", OPEN_STATUSES)
    .not("provider_order_id", "is", null)
    .limit(500);

  const updated = await syncOrders((data ?? []) as Order[]);
  return NextResponse.json({ ok: true, checked: data?.length ?? 0, updated });
}
