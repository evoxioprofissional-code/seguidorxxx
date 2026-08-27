"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Settings {
  minimum_deposit: number;
  minimum_margin: number;
  provider_low_balance_threshold: number;
  reseller_discount_percentage: number;
  maintenance_mode: boolean;
  orders_enabled: boolean;
  announcement_enabled: boolean;
  announcement_title: string;
  announcement_message: string;
  bonus_enabled: boolean;
  bonus_tiers: { min: number; followers: number }[];
}

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minimum_deposit: Number(form.minimum_deposit),
          minimum_margin: Number(form.minimum_margin),
          provider_low_balance_threshold: Number(form.provider_low_balance_threshold),
          reseller_discount_percentage: Number(form.reseller_discount_percentage),
          maintenance_mode: form.maintenance_mode,
          orders_enabled: form.orders_enabled,
          announcement: {
            enabled: form.announcement_enabled,
            title: form.announcement_title,
            message: form.announcement_message,
          },
          bonus_enabled: form.bonus_enabled,
          deposit_bonuses: form.bonus_tiers
            .map((t) => ({ min: Number(t.min), followers: Number(t.followers) }))
            .filter((t) => t.min > 0 && t.followers > 0),
        }),
      });
      if (res.ok) {
        toast.success("Configurações salvas.");
        router.refresh();
      } else toast.error("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Depósito mínimo (R$)" type="number" value={form.minimum_deposit}
            onChange={(e) => set("minimum_deposit", Number(e.target.value))} />
          <Input label="Margem mínima global (%)" type="number" value={form.minimum_margin}
            onChange={(e) => set("minimum_margin", Number(e.target.value))} />
          <Input label="Alerta de saldo do fornecedor (USD)" type="number"
            value={form.provider_low_balance_threshold}
            onChange={(e) => set("provider_low_balance_threshold", Number(e.target.value))}
            hint="Avisa no painel quando o saldo do fornecedor ficar abaixo disso." />
          <Input label="Desconto de revendedor (%)" type="number"
            value={form.reseller_discount_percentage}
            onChange={(e) => set("reseller_discount_percentage", Number(e.target.value))}
            hint="Desconto aplicado no preço para quem compra pela API. 0 = mesmo preço do varejo." />
        </div>
      </div>

      <div className="card divide-y divide-border">
        <ToggleRow
          label="Pedidos habilitados"
          desc="Desative para pausar novas compras temporariamente."
          on={form.orders_enabled}
          onChange={(v) => set("orders_enabled", v)}
        />
        <ToggleRow
          label="Modo manutenção"
          desc="Bloqueia a criação de pedidos e sinaliza manutenção."
          on={form.maintenance_mode}
          onChange={(v) => set("maintenance_mode", v)}
        />
      </div>

      {/* Aviso / popup para os clientes */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Aviso no site (popup)</h2>
            <p className="text-sm text-fg-muted">
              Aparece pros clientes ao entrar no painel. Use para avisar sobre lentidão,
              serviços recomendados, manutenção, etc.
            </p>
          </div>
          <button
            onClick={() => set("announcement_enabled", !form.announcement_enabled)}
            className={
              "relative h-6 w-11 shrink-0 rounded-full transition-colors " +
              (form.announcement_enabled ? "bg-primary" : "bg-surface-3")
            }
          >
            <span
              className={
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform " +
                (form.announcement_enabled ? "translate-x-5" : "translate-x-0.5")
              }
            />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <Input
            label="Título"
            value={form.announcement_title}
            onChange={(e) => set("announcement_title", e.target.value)}
            placeholder="⚡ Velocidade atualizada"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg-muted">Mensagem</label>
            <textarea
              value={form.announcement_message}
              onChange={(e) => set("announcement_message", e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-primary"
              placeholder={"Instagram atualizou hoje e alguns serviços estão mais lentos.\n\nRecomendados (início rápido): Seguidores Instagram Emergencial.\n\nSe tiver pedido travado, solicite cancelamento no suporte."}
            />
            <p className="mt-1 text-xs text-fg-subtle">
              Quebras de linha são mantidas. Ao mudar o texto, o popup reaparece pra quem já
              tinha fechado.
            </p>
          </div>
        </div>
      </div>

      {/* Bônus por depósito */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Bônus por depósito</h2>
            <p className="text-sm text-fg-muted">
              Cliente ganha seguidores grátis ao depositar. Ele resgata informando o @.
            </p>
          </div>
          <button
            onClick={() => set("bonus_enabled", !form.bonus_enabled)}
            className={
              "relative h-6 w-11 shrink-0 rounded-full transition-colors " +
              (form.bonus_enabled ? "bg-primary" : "bg-surface-3")
            }
          >
            <span
              className={
                "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform " +
                (form.bonus_enabled ? "translate-x-5" : "translate-x-0.5")
              }
            />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {form.bonus_tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-2 gap-3">
              <Input
                label={i === 0 ? "Depósito (R$)" : undefined}
                type="number"
                value={t.min}
                onChange={(e) => {
                  const tiers = [...form.bonus_tiers];
                  tiers[i] = { ...tiers[i], min: Number(e.target.value) };
                  set("bonus_tiers", tiers);
                }}
              />
              <Input
                label={i === 0 ? "Seguidores grátis" : undefined}
                type="number"
                value={t.followers}
                onChange={(e) => {
                  const tiers = [...form.bonus_tiers];
                  tiers[i] = { ...tiers[i], followers: Number(e.target.value) };
                  set("bonus_tiers", tiers);
                }}
              />
            </div>
          ))}
          <button
            onClick={() => set("bonus_tiers", [...form.bonus_tiers, { min: 0, followers: 0 }])}
            className="text-sm text-primary-soft hover:underline"
          >
            + Adicionar faixa
          </button>
        </div>
      </div>

      <Button onClick={save} loading={saving}>Salvar configurações</Button>
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  on,
  onChange,
}: {
  label: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-5">
      <div>
        <p className="font-medium text-fg">{label}</p>
        <p className="text-sm text-fg-muted">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!on)}
        className={
          "relative h-6 w-11 shrink-0 rounded-full transition-colors " +
          (on ? "bg-primary" : "bg-surface-3")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform " +
            (on ? "translate-x-5" : "translate-x-0.5")
          }
        />
      </button>
    </div>
  );
}
