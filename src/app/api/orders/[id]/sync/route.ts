import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncOrderById } from "@/lib/orders/sync";
import { rateLimit } from "@/lib/rate-limit";

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

  if (!rateLimit(`sync:${user.id}`, 20, 60_000).ok)
    return NextResponse.json({ error: "Aguarde um instante." }, { status: 429 });

  // ownership via RLS
  const { data: owned } = await supabase.from("orders").select("id").eq("id", id).single();
  if (!owned) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  const order = await syncOrderById(id);
  return NextResponse.json({
    status: order?.status,
    provider_status: order?.provider_status,
    remains: order?.remains,
    start_count: order?.start_count,
  });
}
