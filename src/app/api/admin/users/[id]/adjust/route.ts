import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminAdjustBalanceSchema } from "@/lib/validations";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = adminAdjustBalanceSchema.safeParse({ ...(body as object), userId: id });
  if (!parsed.success)
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );

  const db = createAdminClient();
  const { data: newBalance, error } = await db.rpc("credit_balance", {
    p_user_id: id,
    p_amount: parsed.data.amount,
    p_type: "adjustment",
    p_description: `Ajuste manual: ${parsed.data.reason}`,
    p_reference_id: `adjust_${admin.id}_${Date.now()}`,
  });

  if (error) {
    const msg = error.message.includes("NEGATIVE_BALANCE")
      ? "O ajuste deixaria o saldo negativo."
      : "Falha ao ajustar saldo.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true, balance: newBalance });
}
