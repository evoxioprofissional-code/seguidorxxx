import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOrderSchema } from "@/lib/validations";
import { createOrder } from "@/lib/orders/create";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const rl = rateLimit(`order:${user.id}`, 12, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde um instante." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  // Chave de idempotência: usa a fornecida ou gera uma estável por conteúdo curto.
  const idempotencyKey =
    parsed.data.idempotencyKey ?? crypto.randomUUID();

  const result = await createOrder({
    userId: user.id,
    serviceId: parsed.data.serviceId,
    link: parsed.data.link,
    quantity: parsed.data.quantity,
    idempotencyKey,
  });

  if (!result.ok) {
    const status = result.code === "INSUFFICIENT_BALANCE" ? 402 : 400;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }

  return NextResponse.json({
    order: {
      id: result.order.id,
      public_order_id: result.order.public_order_id,
      status: result.order.status,
      customer_price: result.order.customer_price,
    },
  });
}
