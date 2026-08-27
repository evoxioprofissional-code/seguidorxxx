import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/providers";
import { serverEnv } from "@/lib/env";
import { OPEN_STATUSES } from "@/lib/orders/status";
import type { Order } from "@/types/database";

export interface AdminMetrics {
  revenueToday: number;
  revenueMonth: number;
  grossProfit: number;
  totalUsers: number;
  totalOrders: number;
  ordersProcessing: number;
  ordersCompleted: number;
  averageTicket: number;
  providerBalance: number | null;
  providerCurrency: string | null;
  lowBalance: boolean;
  lowBalanceThreshold: number;
}

const REVENUE_STATUSES = ["processing", "completed", "partial"];

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const admin = createAdminClient();

  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ data: orders }, { count: totalUsers }, settingsRes] = await Promise.all([
    admin.from("orders").select("*"),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("app_settings").select("key,value").eq("key", "provider_low_balance_threshold").single(),
  ]);

  const list = (orders ?? []) as Order[];
  const billable = list.filter((o) => REVENUE_STATUSES.includes(o.status));

  const revenueToday = billable
    .filter((o) => o.created_at >= startDay)
    .reduce((s, o) => s + Number(o.customer_price), 0);
  const revenueMonth = billable
    .filter((o) => o.created_at >= startMonth)
    .reduce((s, o) => s + Number(o.customer_price), 0);
  const grossProfit = billable.reduce((s, o) => s + Number(o.profit), 0);
  const totalRevenue = billable.reduce((s, o) => s + Number(o.customer_price), 0);

  const ordersProcessing = list.filter((o) => OPEN_STATUSES.includes(o.status)).length;
  const ordersCompleted = list.filter((o) => o.status === "completed").length;
  const averageTicket = billable.length ? totalRevenue / billable.length : 0;

  const thresholdUsd = Number(settingsRes?.data?.value ?? 50);

  // saldo do fornecedor (convertido para BRL para exibição)
  let providerBalance: number | null = null;
  let providerCurrency: string | null = null;
  let lowBalance = false;
  try {
    const provider = getProvider();
    if (provider.isConfigured()) {
      const bal = await provider.getBalance();
      providerCurrency = bal.currency;
      providerBalance = bal.currency === "USD" ? bal.balance * serverEnv.usdBrlRate : bal.balance;
      lowBalance = bal.balance < thresholdUsd;
    }
  } catch {
    providerBalance = null;
  }

  return {
    revenueToday,
    revenueMonth,
    grossProfit,
    totalUsers: totalUsers ?? 0,
    totalOrders: list.length,
    ordersProcessing,
    ordersCompleted,
    averageTicket,
    providerBalance,
    providerCurrency,
    lowBalance,
    lowBalanceThreshold: thresholdUsd,
  };
}
