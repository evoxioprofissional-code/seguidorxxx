import Link from "next/link";
import { Wallet, ListOrdered, Loader, CheckCircle2, ArrowRight, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { getBalance } from "@/lib/queries";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBRL, formatDate, formatNumber } from "@/lib/format";
import { OPEN_STATUSES } from "@/lib/orders/status";
import { BonusCard } from "@/components/bonus/bonus-card";
import type { Order, BonusGrant } from "@/types/database";

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const balance = await getBalance();

  const [{ data: orders }, { data: bonuses }] = await Promise.all([
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
    supabase.from("bonus_grants").select("*").eq("status", "pending"),
  ]);

  const list = (orders ?? []) as Order[];
  const total = list.length;
  const inProgress = list.filter((o) => OPEN_STATUSES.includes(o.status)).length;
  const completed = list.filter((o) => o.status === "completed").length;
  const recent = list.slice(0, 5);

  const firstName = (profile.name ?? "").split(" ")[0] || "por aqui";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Olá, {firstName}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Aqui está o resumo da sua conta.
          </p>
        </div>
        <Link href="/services">
          <Button className="gap-2">
            <ShoppingBag className="h-4 w-4" /> Comprar serviço
          </Button>
        </Link>
      </div>

      <BonusCard bonuses={(bonuses ?? []) as BonusGrant[]} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Saldo disponível" value={formatBRL(balance)} icon={Wallet} accent="primary" />
        <StatCard label="Pedidos realizados" value={formatNumber(total)} icon={ListOrdered} accent="info" />
        <StatCard label="Em andamento" value={formatNumber(inProgress)} icon={Loader} accent="warning" />
        <StatCard label="Concluídos" value={formatNumber(completed)} icon={CheckCircle2} accent="success" />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">Pedidos recentes</h2>
          <Link
            href="/orders"
            className="flex items-center gap-1 text-sm text-primary-soft hover:underline"
          >
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<ListOrdered className="h-6 w-6" />}
              title="Nenhum pedido ainda"
              description="Escolha um serviço e faça seu primeiro pedido em segundos."
              action={
                <Link href="/services">
                  <Button>Explorar serviços</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">
                    {o.service_name ?? "Serviço"}
                  </p>
                  <p className="text-xs text-fg-subtle">
                    {o.public_order_id} · {formatNumber(o.quantity)} un ·{" "}
                    {formatDate(o.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="hidden text-sm font-medium text-fg sm:block">
                    {formatBRL(o.customer_price)}
                  </span>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
