import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateKey } from "@/lib/api-keys";
import { rateLimit } from "@/lib/rate-limit";

/** Gera uma nova API key para o usuário logado. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  if (!rateLimit(`genkey:${user.id}`, 10, 60_000).ok)
    return NextResponse.json({ error: "Aguarde um instante." }, { status: 429 });

  let label = "Minha chave";
  try {
    const body = (await request.json()) as { label?: string };
    if (body.label) label = String(body.label).slice(0, 60);
  } catch {
    /* sem body */
  }

  const admin = createAdminClient();

  // limite de 5 chaves ativas por usuário
  const { count } = await admin
    .from("api_keys")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("active", true);
  if ((count ?? 0) >= 5)
    return NextResponse.json(
      { error: "Limite de 5 chaves ativas atingido. Revogue uma antes." },
      { status: 400 }
    );

  const key = generateKey();
  const { data, error } = await admin
    .from("api_keys")
    .insert({ user_id: user.id, key, label })
    .select("id,key,label,created_at")
    .single();

  if (error) return NextResponse.json({ error: "Falha ao gerar chave." }, { status: 500 });
  return NextResponse.json({ key: data });
}
