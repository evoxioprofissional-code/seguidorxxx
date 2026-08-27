import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGateway } from "@/lib/payments";
import { depositSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  if (!rateLimit(`deposit:${user.id}`, 10, 60_000).ok)
    return NextResponse.json({ error: "Aguarde um instante." }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = depositSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Valor inválido." },
      { status: 400 }
    );

  // depósito mínimo
  const admin = createAdminClient();
  const { data: minSetting } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "minimum_deposit")
    .single();
  const min = Number(minSetting?.value ?? 10);
  if (parsed.data.amount < min)
    return NextResponse.json({ error: `Depósito mínimo: R$ ${min}.` }, { status: 400 });

  const gateway = getGateway();
  let charge;
  try {
    charge = await gateway.createPix({
      userId: user.id,
      amount: parsed.data.amount,
      payerEmail: user.email ?? undefined,
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível gerar o pagamento. Tente novamente." },
      { status: 502 }
    );
  }

  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      provider: gateway.id,
      external_payment_id: charge.externalId,
      amount: parsed.data.amount,
      status: "pending",
      qr_code: charge.qrCode,
      qr_code_base64: charge.qrCodeBase64,
      expires_at: charge.expiresAt,
    })
    .select("*")
    .single();

  if (error || !payment)
    return NextResponse.json({ error: "Não foi possível gerar o pagamento." }, { status: 500 });

  return NextResponse.json({
    payment: {
      id: payment.id,
      amount: payment.amount,
      qr_code: payment.qr_code,
      qr_code_base64: payment.qr_code_base64,
      expires_at: payment.expires_at,
      provider: payment.provider,
    },
  });
}
