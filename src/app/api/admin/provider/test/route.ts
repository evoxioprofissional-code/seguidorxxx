import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/guard";
import { getProvider } from "@/lib/providers";
import { isProviderConfigured, serverEnv } from "@/lib/env";

export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  if (!isProviderConfigured())
    return NextResponse.json({ configured: false, connected: false });

  try {
    const provider = getProvider();
    const balance = await provider.getBalance();
    return NextResponse.json({
      configured: true,
      connected: true,
      balanceUsd: balance.balance,
      currency: balance.currency,
      balanceBrl:
        balance.currency === "USD" ? balance.balance * serverEnv.usdBrlRate : balance.balance,
    });
  } catch (err) {
    return NextResponse.json({
      configured: true,
      connected: false,
      error: err instanceof Error ? err.message : "Falha na conexão.",
    });
  }
}
