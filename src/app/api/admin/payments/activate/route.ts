import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/guard";
import {
  registry,
  getGatewayRow,
  credsFromRow,
  setActiveProviderId,
} from "@/lib/payments";

/** POST { id }: define qual gateway fica ativo (recebe os PIX). */
export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  let body: { id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const id = String(body.id ?? "");
  if (id !== "mock" && !registry[id])
    return NextResponse.json({ error: "Gateway inválido." }, { status: 400 });

  // Só ativa um gateway real se ele já tiver uma chave configurada.
  if (id !== "mock") {
    const row = await getGatewayRow(id);
    const creds = credsFromRow(id, row);
    if (!creds.apiKey)
      return NextResponse.json(
        { error: "Conecte o gateway antes de ativá-lo." },
        { status: 400 }
      );
    if (!creds.webhookSecret)
      return NextResponse.json(
        { error: "Configure o token/segredo do webhook antes de ativar." },
        { status: 400 }
      );
  }

  await setActiveProviderId(id);
  return NextResponse.json({ ok: true, active: id });
}
