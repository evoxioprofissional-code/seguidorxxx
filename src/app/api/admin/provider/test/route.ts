import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/guard";
import { getProvider, DEFAULT_PROVIDER } from "@/lib/providers";
import { loadProviderCreds } from "@/lib/providers/config";
import { serverEnv } from "@/lib/env";

function mask(key?: string | null): string | null {
  if (!key) return null;
  const k = String(key);
  if (k.length <= 8) return "••••";
  return `${k.slice(0, 4)}••••${k.slice(-4)}`;
}

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const { key, source } = await loadProviderCreds(DEFAULT_PROVIDER);
  if (!key)
    return NextResponse.json({ configured: false, connected: false, source: null });

  try {
    const provider = getProvider();
    const balance = await provider.getBalance();
    return NextResponse.json({
      configured: true,
      connected: true,
      source,
      maskedKey: mask(key),
      balanceUsd: balance.balance,
      currency: balance.currency,
      balanceBrl:
        balance.currency === "USD" ? balance.balance * serverEnv.usdBrlRate : balance.balance,
    });
  } catch (err) {
    return NextResponse.json({
      configured: true,
      connected: false,
      source,
      maskedKey: mask(key),
      error: err instanceof Error ? err.message : "Falha na conexão.",
    });
  }
}
