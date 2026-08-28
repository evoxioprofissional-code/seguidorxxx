import { ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBalance, getSettings } from "@/lib/queries";
import { isMockPayments } from "@/lib/payments";
import { DepositPanel } from "@/components/wallet/deposit-panel";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBRL, formatDateTime } from "@/lib/format";
import type { WalletTransaction } from "@/types/database";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TX_LABEL: Record<string, string> = {
  deposit: "Depósito",
  purchase: "Compra",
  refund: "Reembolso",
  adjustment: "Ajuste",
};

export default async function WalletPage() {
  const supabase = await createClient();
  const [balance, settings] = await Promise.all([getBalance(), getSettings()]);
  const { data } = await supabase
    .from("wallet_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  const txs = (data ?? []) as WalletTransaction[];
  const minDeposit = Number(settings.minimum_deposit ?? 10);
  const bonusEnabled = settings.bonus_enabled !== false;
  const bonusTiers = (Array.isArray(settings.deposit_bonuses) ? settings.deposit_bonuses : []) as {
    min: number;
    followers: number;
  }[];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Carteira</h1>
        <p className="mt-1 text-sm text-fg-muted">Gerencie seu saldo e veja o histórico.</p>
      </div>

      {/* saldo */}
      <div className="card relative overflow-hidden p-6">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(30rem 12rem at 100% 0%, rgba(242,99,34,0.18), transparent 60%)",
          }}
        />
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary-soft">
            <WalletIcon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm text-fg-muted">Saldo disponível</p>
            <p className="text-3xl font-bold tracking-tight text-fg">{formatBRL(balance)}</p>
          </div>
        </div>
      </div>

      {bonusEnabled && bonusTiers.length > 0 && (
        <div
          className="rounded-xl border border-primary/30 p-5"
          style={{ background: "linear-gradient(100deg, rgba(242,99,34,0.16), rgba(242,99,34,0.05))" }}
        >
          <div className="flex items-center gap-2 text-primary-soft">
            <Gift className="h-5 w-5" />
            <h2 className="font-semibold">Deposite e ganhe seguidores grátis</h2>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {bonusTiers
              .slice()
              .sort((a, b) => Number(a.min) - Number(b.min))
              .map((t) => (
                <div key={t.min} className="rounded-lg border border-border bg-surface-2 p-3 text-center">
                  <p className="text-sm text-fg-muted">Depositando {formatBRL(t.min)}</p>
                  <p className="mt-0.5 font-bold text-fg">
                    +{new Intl.NumberFormat("pt-BR").format(t.followers)} seguidores
                  </p>
                </div>
              ))}
          </div>
          <p className="mt-3 text-xs text-fg-subtle">
            O bônus libera automaticamente após o pagamento. Você resgata no início,
            informando seu @ do Instagram.
          </p>
        </div>
      )}

      <DepositPanel minDeposit={minDeposit} isMock={isMockPayments()} />

      {/* histórico */}
      <div className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Histórico</h2>
        </div>
        {txs.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<WalletIcon className="h-6 w-6" />}
              title="Sem movimentações"
              description="Seus depósitos e compras aparecerão aqui."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {txs.map((t) => {
              const positive = Number(t.amount) >= 0;
              return (
                <div key={t.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        positive ? "bg-success/12 text-success" : "bg-danger/12 text-danger"
                      )}
                    >
                      {positive ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-fg">
                        {TX_LABEL[t.type] ?? t.type}
                      </p>
                      <p className="text-xs text-fg-subtle">
                        {t.description ?? t.reference_id ?? formatDateTime(t.created_at)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      positive ? "text-success" : "text-fg"
                    )}
                  >
                    {positive ? "+" : "−"}
                    {formatBRL(Math.abs(Number(t.amount)))}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
