import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CONFIGURABLE_GATEWAYS,
  registry,
  getActiveProviderId,
  getGatewayRow,
  credsFromRow,
  setActiveProviderId,
  type GatewayCredentials,
} from "@/lib/payments";

/** Mostra só o começo e o fim da chave (nunca a chave inteira). */
function mask(key?: string | null): string | null {
  if (!key) return null;
  const k = String(key);
  if (k.length <= 8) return "••••";
  return `${k.slice(0, 4)}••••${k.slice(-4)}`;
}

/** GET: status de cada gateway configurável (dados seguros de exibir). */
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const active = await getActiveProviderId();
  const gateways = await Promise.all(
    CONFIGURABLE_GATEWAYS.map(async (g) => {
      const row = await getGatewayRow(g.id);
      const creds = credsFromRow(g.id, row);
      return {
        id: g.id,
        label: g.label,
        requiresCpf: Boolean(g.requiresCpf),
        configured: Boolean(creds.apiKey),
        connected: Boolean(row?.connected) || Boolean(creds.apiKey),
        accountLabel: row?.account_label ?? null,
        maskedKey: mask(creds.apiKey),
        hasWebhookSecret: Boolean(creds.webhookSecret),
        env: creds.env ?? "production",
        source: row?.api_key ? "painel" : creds.apiKey ? "env" : null,
      };
    })
  );

  return NextResponse.json({ active, gateways });
}

/** POST: salva credenciais de um gateway, testa a conexão e guarda o resultado. */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  let body: { id?: string; apiKey?: string; webhookSecret?: string; env?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const id = String(body.id ?? "");
  const gateway = registry[id];
  if (!gateway || id === "mock")
    return NextResponse.json({ error: "Gateway inválido." }, { status: 400 });

  const db = createAdminClient();
  const existing = await getGatewayRow(id);

  // Mescla: mantém os segredos antigos quando o campo vier vazio.
  const apiKey = body.apiKey?.trim() ? body.apiKey.trim() : existing?.api_key ?? "";
  const webhookSecret = body.webhookSecret?.trim()
    ? body.webhookSecret.trim()
    : existing?.webhook_secret ?? "";
  const extra: Record<string, unknown> = { ...(existing?.extra ?? {}) };
  if (id === "asaas") extra.env = body.env === "sandbox" ? "sandbox" : "production";

  const creds: GatewayCredentials = {
    apiKey,
    webhookSecret,
    env: (extra.env as string) || "production",
  };

  if (!apiKey)
    return NextResponse.json({ error: "Informe a chave de API." }, { status: 400 });

  const test = await gateway.testConnection(creds);

  await db.from("payment_gateways").upsert(
    {
      id,
      api_key: apiKey || null,
      webhook_secret: webhookSecret || null,
      extra: extra as never,
      connected: test.ok,
      account_label: test.accountLabel ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  return NextResponse.json({
    ok: test.ok,
    accountLabel: test.accountLabel ?? null,
    message: test.message ?? null,
  });
}

/** DELETE ?id=asaas: desconecta um gateway (apaga credenciais). */
export async function DELETE(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!registry[id] || id === "mock")
    return NextResponse.json({ error: "Gateway inválido." }, { status: 400 });

  const db = createAdminClient();
  await db.from("payment_gateways").delete().eq("id", id);

  // Se o gateway desconectado era o ativo, volta para o modo simulado.
  if ((await getActiveProviderId()) === id) await setActiveProviderId("mock");

  return NextResponse.json({ ok: true });
}
