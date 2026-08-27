import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Payment } from "@/types/database";

/** Status de um pagamento do próprio usuário (para polling do front). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  const { data } = await supabase
    .from("payments")
    .select("status")
    .eq("id", id)
    .single<Pick<Payment, "status">>();

  if (!data) return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
  return NextResponse.json({ status: data.status });
}
