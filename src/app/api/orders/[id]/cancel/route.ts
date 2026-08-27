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

  if (!rateLimit(`cancel:${user.id}`, 8, 60_000).ok)
    return NextResponse.json({ error: "Aguarde um instante." }, { status: 429 });

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single<Order>();

  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (!order.has_cancel || !order.provider_order_id)
    return NextResponse.json({ error: "Cancelamento não disponível para este pedido." }, { status: 400 });
  if (!["pending", "processing"].includes(order.status))
    return NextResponse.json({ error: "Este pedido não pode mais ser cancelado." }, { status: 400 });

  const admin = createAdminClient();
  try {
    const provider = getProvider(order.provider);
    await provider.cancelOrders([order.provider_order_id]);
    // Marca solicitação; NÃO estorna automaticamente — só após confirmação do fornecedor (via sync).
    await admin
      .from("orders")
      .update({ provider_status: "Cancel requested" })
      .eq("id", order.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof ProviderError ? err.message : "Falha ao solicitar cancelamento.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
