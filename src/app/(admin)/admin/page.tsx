import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Users,
  ListOrdered,
  Loader,
  CheckCircle2,
  Receipt,
  Server,
  AlertTriangle,
} from "lucide-react";
import { getAdminMetrics } from "@/lib/admin/metrics";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatBRL, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const m = await getAdminMetrics();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Visão geral</h1>
        <p className="mt-1 text-sm text-fg-muted">Desempenho da operação em tempo real.</p>
      </div>

      {m.lowBalance && m.providerBalance != null && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <p className="text-sm text-warning">
            Saldo do fornecedor baixo ({formatBRL(m.providerBalance)}). Considere recarregar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Faturamento hoje" value={formatBRL(m.revenueToday)} icon={DollarSign} accent="primary" />
        <StatCard label="Faturamento mês" value={formatBRL(m.revenueMonth)} icon={TrendingUp} accent="success" />
        <StatCard label="Lucro bruto" value={formatBRL(m.grossProfit)} icon={Receipt} accent="info" />
        <StatCard label="Ticket médio" value={formatBRL(m.averageTicket)} icon={DollarSign} accent="warning" />
        <StatCard label="Usuários" value={formatNumber(m.totalUsers)} icon={Users} accent="info" />
        <StatCard label="Total de pedidos" value={formatNumber(m.totalOrders)} icon={ListOrdered} accent="primary" />
        <StatCard label="Processando" value={formatNumber(m.ordersProcessing)} icon={Loader} accent="warning" />
        <StatCard label="Concluídos" value={formatNumber(m.ordersCompleted)} icon={CheckCircle2} accent="success" />
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary-soft">
            <Server className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm text-fg-muted">Saldo do fornecedor</p>
            {m.providerBalance != null ? (
              <p className="text-2xl font-bold text-fg">
                {formatBRL(m.providerBalance)}
                {m.lowBalance && (
                  <span className="ml-2 text-sm font-medium text-warning">Saldo baixo</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-fg-subtle">
                Fornecedor não configurado ou indisponível.{" "}
                <Link href="/admin/integrations" className="text-primary-soft hover:underline">
                  Configurar
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
