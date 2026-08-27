import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdjustBalance } from "@/components/admin/adjust-balance";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { formatBRL, formatDateTime } from "@/lib/format";
import type { Order, Payment, Profile, Wallet, WalletTransaction } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminUserDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("*").eq("id", id).single();
  if (!profile) notFound();
  const user = profile as Profile;

  const [{ data: wallet }, { data: orders }, { data: txs }, { data: payments }] =
    await Promise.all([
      admin.from("wallets").select("*").eq("user_id", id).single(),
      admin.from("orders").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
      admin.from("wallet_transactions").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
      admin.from("payments").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    ]);

  const balance = Number((wallet as Wallet | null)?.balance ?? 0);
  const orderList = (orders ?? []) as Order[];
  const txList = (txs ?? []) as WalletTransaction[];
  const payList = (payments ?? []) as Payment[];
  const totalSpent = orderList
    .filter((o) => ["processing", "completed", "partial"].includes(o.status))
    .reduce((s, o) => s + Number(o.customer_price), 0);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{user.name ?? "Usuário"}</h1>
            <p className="text-sm text-fg-muted">{user.email}</p>
            <div className="mt-2 flex gap-2">
              {user.role === "admin" && <Badge color="primary">admin</Badge>}
              <Badge color={user.status === "active" ? "success" : "danger"}>
                {user.status === "active" ? "Ativo" : "Bloqueado"}
              </Badge>
            </div>
          </div>
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-xs text-fg-subtle">Saldo</p>
              <p className="text-lg font-bold text-fg">{formatBRL(balance)}</p>
            </div>
            <div>
              <p className="text-xs text-fg-subtle">Total gasto</p>
              <p className="text-lg font-bold text-fg">{formatBRL(totalSpent)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AdjustBalance userId={id} balance={balance} />
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Section title="Pedidos recentes">
            {orderList.length === 0 ? (
              <Empty />
            ) : (
              orderList.map((o) => (
                <Row key={o.id}
                  left={<Link href={`/orders/${o.id}`} className="hover:underline">{o.service_name ?? "Serviço"}</Link>}
                  sub={o.public_order_id}
                  right={<StatusBadge status={o.status} />}
                  amount={formatBRL(o.customer_price)}
                />
              ))
            )}
          </Section>

          <Section title="Movimentações">
            {txList.length === 0 ? <Empty /> : txList.map((t) => (
              <Row key={t.id} left={t.description ?? t.type} sub={formatDateTime(t.created_at)}
                amount={`${Number(t.amount) >= 0 ? "+" : "−"}${formatBRL(Math.abs(Number(t.amount)))}`} />
            ))}
          </Section>

          <Section title="Depósitos">
            {payList.length === 0 ? <Empty /> : payList.map((p) => (
              <Row key={p.id} left={formatBRL(p.amount)} sub={formatDateTime(p.created_at)}
                right={<Badge color={p.status === "approved" ? "success" : "default"}>{p.status}</Badge>} />
            ))}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({
  left,
  sub,
  right,
  amount,
}: {
  left: React.ReactNode;
  sub?: string;
  right?: React.ReactNode;
  amount?: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-medium text-fg">{left}</p>
        {sub && <p className="text-xs text-fg-subtle">{sub}</p>}
      </div>
      <div className="flex items-center gap-3">
        {amount && <span className="text-fg">{amount}</span>}
        {right}
      </div>
    </div>
  );
}

function Empty() {
  return <p className="px-5 py-4 text-sm text-fg-subtle">Nada por aqui.</p>;
}
