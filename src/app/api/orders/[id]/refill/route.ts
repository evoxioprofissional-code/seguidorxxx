import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/providers";
import { ProviderError } from "@/lib/providers/types";
import { rateLimit } from "@/lib/rate-limit";
import type { Order } from "@/types/database";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  if (!rateLimit(`refill:${user.id}`, 8, 60_000).ok)
    return NextResponse.json({ error: "Aguarde um instante." }, { status: 429 });

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single<Order>();

  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (!order.has_refill || !order.provider_order_id)
    return NextResponse.json({ error: "Reposição não disponível para este pedido." }, { status: 400 });
  if (!["completed", "partial"].includes(order.status))
    return NextResponse.json({ error: "Só é possível solicitar reposição de pedidos concluídos ou parciais." }, { status: 400 });

  const admin = createAdminClient();

  // evita refills duplicados abertos
  const { data: existing } = await admin
    .from("order_refills")
    .select("id,status")
    .eq("order_id", order.id)
    .in("status", ["pending", "Pending", "In progress"]);
  if (existing && existing.length > 0)
    return NextResponse.json({ error: "Já existe uma reposição em andamento." }, { status: 409 });

  try {
    const provider = getProvider(order.provider);
    const { refillId } = await provider.createRefill(order.provider_order_id);
    await admin.from("order_refills").insert({
      order_id: order.id,
      provider_refill_id: refillId,
      status: "pending",
    });
    return NextResponse.json({ ok: true, refillId });
  } catch (err) {
    const message = err instanceof ProviderError ? err.message : "Falha ao solicitar reposição.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
