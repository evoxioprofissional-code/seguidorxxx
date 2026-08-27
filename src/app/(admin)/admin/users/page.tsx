import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { formatBRL, formatDate, formatNumber } from "@/lib/format";
import type { Order, Profile, Wallet } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = createAdminClient();
  const [{ data: profiles }, { data: wallets }, { data: orders }] = await Promise.all([
    admin.from("profiles").select("*").order("created_at", { ascending: false }),
    admin.from("wallets").select("user_id,balance"),
    admin.from("orders").select("user_id,customer_price,status"),
  ]);

  const balanceMap = new Map<string, number>();
  for (const w of (wallets ?? []) as Wallet[]) balanceMap.set(w.user_id, Number(w.balance));

  const spentMap = new Map<string, { count: number; total: number }>();
  for (const o of (orders ?? []) as Order[]) {
    const cur = spentMap.get(o.user_id) ?? { count: 0, total: 0 };
    cur.count += 1;
    if (["processing", "completed", "partial"].includes(o.status))
      cur.total += Number(o.customer_price);
    spentMap.set(o.user_id, cur);
  }

  const users = (profiles ?? []) as Profile[];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
        <p className="mt-1 text-sm text-fg-muted">{users.length} cadastrados.</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-subtle">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Saldo</th>
              <th className="px-4 py-3 font-medium">Pedidos</th>
              <th className="px-4 py-3 font-medium">Total gasto</th>
              <th className="px-4 py-3 font-medium">Cadastro</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => {
              const s = spentMap.get(u.id) ?? { count: 0, total: 0 };
              return (
                <tr key={u.id} className="hover:bg-surface-2">
                  <td className="px-4 py-3 font-medium text-fg">
                    {u.name ?? "—"}
                    {u.role === "admin" && (
                      <Badge color="primary" className="ml-2">admin</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted">{u.email}</td>
                  <td className="px-4 py-3 font-medium text-fg">
                    {formatBRL(balanceMap.get(u.id) ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{formatNumber(s.count)}</td>
                  <td className="px-4 py-3 text-fg-muted">{formatBRL(s.total)}</td>
                  <td className="px-4 py-3 text-xs text-fg-subtle">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <Badge color={u.status === "active" ? "success" : "danger"}>
                      {u.status === "active" ? "Ativo" : "Bloqueado"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/users/${u.id}`} className="text-primary-soft hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
