import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimBonus } from "@/lib/bonus";
import { linkSchema } from "@/lib/validations";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  if (!rateLimit(`bonus:${user.id}`, 10, 60_000).ok)
    return NextResponse.json({ error: "Aguarde um instante." }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const parsed = linkSchema.safeParse((body as { link?: string })?.link);
  if (!parsed.success)
    return NextResponse.json({ error: "Informe um link válido do Instagram." }, { status: 400 });

  const result = await claimBonus(user.id, id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json({ ok: true, orderId: result.orderId });
}
