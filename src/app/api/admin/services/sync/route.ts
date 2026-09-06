import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/guard";
import { syncServices } from "@/lib/admin/sync-services";
import { isProviderConfiguredDb } from "@/lib/providers/config";
import { DEFAULT_PROVIDER } from "@/lib/providers";

export async function POST() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  if (!(await isProviderConfiguredDb(DEFAULT_PROVIDER)))
    return NextResponse.json(
      { error: "API do fornecedor não configurada. Conecte em Integrações." },
      { status: 400 }
    );

  try {
    const result = await syncServices();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha na sincronização.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
