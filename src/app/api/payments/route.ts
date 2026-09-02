import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getGateway } from "@/lib/payments";
import { depositSchema, isValidCpfCnpj, onlyDigits } from "@/lib/validations";
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

  // Perfil: nome + CPF/CNPJ + id de cliente já cadastrado no gateway (reuso).
  const { data: profile } = await admin
    .from("profiles")
    .select("name, cpf_cnpj, asaas_customer_id")
    .eq("id", user.id)
    .single();

  // Gateways como o Asaas exigem CPF/CNPJ para gerar a cobrança.
  const requiresCpf = gateway.id === "asaas";
  let cpf = profile?.cpf_cnpj ?? null;
  if (requiresCpf && !cpf) {
    const provided = parsed.data.cpf ? onlyDigits(parsed.data.cpf) : "";
    if (!provided)
      return NextResponse.json(
        { error: "Informe seu CPF ou CNPJ para gerar o PIX." },
        { status: 400 }
      );
    if (!isValidCpfCnpj(provided))
      return NextResponse.json({ error: "CPF/CNPJ inválido." }, { status: 400 });
    cpf = provided;
  }

  let charge;
  try {
    charge = await gateway.createPix({
      userId: user.id,
      amount: parsed.data.amount,
      payerEmail: user.email ?? undefined,
      payerName: profile?.name ?? undefined,
      payerCpfCnpj: cpf ?? undefined,
      asaasCustomerId: profile?.asaas_customer_id ?? undefined,
    });
  } catch (err) {
    // Detalhe fica só no log do servidor (Vercel) — não vaza para o cliente.
    console.error("[payments] createPix falhou:", err);
    return NextResponse.json(
      { error: "Não foi possível gerar o pagamento. Tente novamente." },
      { status: 502 }
    );
  }

  // Persiste CPF/CNPJ e o id de cliente do gateway p/ reaproveitar nos próximos.
  if (requiresCpf) {
    const patch: { cpf_cnpj?: string; asaas_customer_id?: string } = {};
    if (cpf && !profile?.cpf_cnpj) patch.cpf_cnpj = cpf;
    if (charge.customerId && charge.customerId !== profile?.asaas_customer_id)
      patch.asaas_customer_id = charge.customerId;
    if (Object.keys(patch).length > 0) {
      await admin.from("profiles").update(patch).eq("id", user.id);
    }
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
