import { Users, Wallet, Percent } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { publicEnv } from "@/lib/env";
import { ReferralLink } from "@/components/referral/referral-link";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatBRL, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function IndicacaoPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const settings = await getSettings();

  const enabled = settings.referral_enabled !== false;
  const pct = Number(settings.referral_commission_percentage ?? 0);

  const { data: stats, error: statsError } = await supabase.rpc("get_my_referral_stats");
  const row = stats?.[0];
  const referredCount = Number(row?.referred_count ?? 0);
  const totalEarned = Number(row?.total_earned ?? 0);
  const base = (publicEnv.appUrl || "").replace(/\/$/, "");
  const link = `${base}/cadastro?ref=${profile.referral_code ?? ""}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="display text-[2rem] leading-none">Indique e ganhe</h1>
        <p className="mt-2 text-fg-muted">
          Compartilhe seu link. Cada pessoa que se cadastrar e depositar te rende comissão.
        </p>
      </div>

      {statsError && (
        <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          Não foi possível carregar seus dados de indicação. Tente novamente em instantes.
        </div>
      )}

      {!enabled ? (
        <div className="card p-6 text-sm text-fg-muted">
          O programa de indicação está temporariamente indisponível.
        </div>
      ) : (
        <>
          <div className="card p-6">
            <p className="text-sm font-medium text-fg">Seu link de indicação</p>
            <p className="mb-4 mt-1 text-sm text-fg-muted">
              Você ganha <span className="font-semibold text-primary">{pct}%</span> de tudo
              que seus indicados depositarem — direto no seu saldo.
            </p>
            <ReferralLink link={link} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Pessoas indicadas" value={formatNumber(referredCount ?? 0)} icon={Users} accent="info" />
            <StatCard label="Você já ganhou" value={formatBRL(totalEarned)} icon={Wallet} accent="success" />
            <StatCard label="Comissão por depósito" value={`${pct}%`} icon={Percent} accent="primary" />
          </div>

          <div className="card p-6">
            <h2 className="font-semibold">Como funciona</h2>
            <ol className="mt-4 space-y-3 text-sm text-fg-muted">
              <li className="flex gap-3">
                <span className="font-mono text-primary">1.</span>
                Compartilhe seu link com amigos e seguidores.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-primary">2.</span>
                Eles se cadastram pelo seu link e adicionam saldo.
              </li>
              <li className="flex gap-3">
                <span className="font-mono text-primary">3.</span>
                Você recebe {pct}% de cada depósito deles, automaticamente no seu saldo.
              </li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
