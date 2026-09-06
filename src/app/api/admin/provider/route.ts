import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider, DEFAULT_PROVIDER } from "@/lib/providers";
import { getProviderRow } from "@/lib/providers/config";
import { serverEnv } from "@/lib/env";
import { formatBRL } from "@/lib/format";

/** POST: salva a chave da API do fornecedor, testa e guarda o resultado. */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  let body: { apiKey?: string; apiUrl?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const db = createAdminClient();
  const existing = await getProviderRow(DEFAULT_PROVIDER);

  // Mescla: mantém a chave antiga quando o campo vier vazio.
  const apiKey = body.apiKey?.trim() ? body.apiKey.trim() : existing?.api_key ?? "";
  const apiUrl = body.apiUrl?.trim() ? body.apiUrl.trim() : existing?.api_url ?? null;

  if (!apiKey)
    return NextResponse.json({ error: "Informe a chave da API." }, { status: 400 });

  // Salva primeiro para que o teste (getBalance) já use a chave nova.
  await db.from("provider_settings").upsert(
    {
      id: DEFAULT_PROVIDER,
      api_key: apiKey,
      api_url: apiUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  // Testa consultando o saldo.
  try {
    const balance = await getProvider().getBalance();
    const brl =
      balance.currency === "USD" ? balance.balance * serverEnv.usdBrlRate : balance.balance;
    const label = `Saldo: ${formatBRL(brl)}`;
    await db
      .from("provider_settings")
      .update({ connected: true, account_label: label })
      .eq("id", DEFAULT_PROVIDER);
    return NextResponse.json({ ok: true, connected: true, message: label });
  } catch (err) {
    await db
      .from("provider_settings")
      .update({ connected: false, account_label: null })
      .eq("id", DEFAULT_PROVIDER);
    return NextResponse.json({
      ok: false,
      connected: false,
      message: err instanceof Error ? err.message : "Falha na conexão.",
    });
  }
}

/** DELETE: desconecta o fornecedor (apaga a chave salva no painel). */
export async function DELETE() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const db = createAdminClient();
  await db.from("provider_settings").delete().eq("id", DEFAULT_PROVIDER);
  return NextResponse.json({ ok: true });
}
