"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Pencil, Star, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { PlatformIcon } from "@/components/catalog/platform-icon";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { computeSalePricePer1000, marginPercentage } from "@/lib/pricing";
import { PLATFORMS, CATEGORIES, categoryLabel, platformLabel } from "@/lib/catalog/taxonomy";
import type { Service } from "@/types/database";

export function ServicesManager({ initial }: { initial: Service[] }) {
  const router = useRouter();
  const [services, setServices] = useState(initial);
  const [syncing, setSyncing] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive" | "warning">("all");
  const [editing, setEditing] = useState<Service | null>(null);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const name = (s.custom_name || `${categoryLabel(s.category)} ${platformLabel(s.platform)}`).toLowerCase();
      if (q && !name.includes(q.toLowerCase()) && !s.provider_service_id.includes(q)) return false;
      if (filter === "active") return s.active;
      if (filter === "inactive") return !s.active;
      if (filter === "warning") return s.pricing_warning;
      return true;
    });
  }, [services, q, filter]);

  async function sync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/services/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Sincronizado: ${data.fetched} serviços (${data.created} novos, ${data.updated} atualizados).`
        );
        router.refresh();
      } else {
        toast.error(data.error ?? "Falha na sincronização.");
      }
    } finally {
      setSyncing(false);
    }
  }

  async function patch(id: string, body: Partial<Service>, silent = false) {
    const res = await fetch(`/api/admin/services/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...data.service } : s)));
      if (!silent) toast.success("Serviço atualizado.");
      return true;
    }
    toast.error(data.error ?? "Falha ao salvar.");
    return false;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Serviços</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {services.length} serviços · {services.filter((s) => s.active).length} ativos
          </p>
        </div>
        <Button onClick={sync} loading={syncing} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Sincronizar API
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[200px] flex-1">
          <Input
            placeholder="Buscar serviço ou ID..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "active", "inactive", "warning"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm",
                filter === f
                  ? "border-primary/40 bg-primary/12 text-primary-soft"
                  : "border-border bg-surface-2 text-fg-muted hover:text-fg"
              )}
            >
              {{ all: "Todos", active: "Ativos", inactive: "Inativos", warning: "⚠ Alerta" }[f]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-fg-muted">
          Nenhum serviço. Clique em <b>Sincronizar API</b> para importar do fornecedor.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const sale = computeSalePricePer1000(s);
            const cost = Number(s.provider_cost);
            const profit = sale - cost;
            const margin = marginPercentage(cost, sale);
            const name = s.custom_name || `${categoryLabel(s.category)} ${platformLabel(s.platform)}`;
            return (
              <div key={s.id} className="card flex flex-wrap items-center gap-4 p-4">
                <PlatformIcon platform={s.platform || "outros"} size={40} />
                <div className="min-w-[160px] flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-fg">{name}</p>
                    {s.featured && <Star className="h-3.5 w-3.5 fill-warning text-warning" />}
                    {s.pricing_warning && (
                      <Badge color="danger">
                        <AlertTriangle className="h-3 w-3" /> Abaixo do custo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-fg-subtle">
                    ID {s.provider_service_id} · {platformLabel(s.platform)} ·{" "}
                    {categoryLabel(s.category)}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center text-xs">
                  <div>
                    <p className="text-fg-subtle">Custo /1k</p>
                    <p className="font-medium text-fg">{formatBRL(cost)}</p>
                  </div>
                  <div>
                    <p className="text-fg-subtle">Venda /1k</p>
                    <p className="font-medium text-fg">{formatBRL(sale)}</p>
                  </div>
                  <div>
                    <p className="text-fg-subtle">Lucro</p>
                    <p className={cn("font-medium", profit >= 0 ? "text-success" : "text-danger")}>
                      {formatBRL(profit)} · {margin}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Toggle
                    on={s.active}
                    onClick={() => patch(s.id, { active: !s.active }, true)}
                    label="Ativo"
                  />
                  <button
                    onClick={() => setEditing(s)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-2 hover:bg-surface-3"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditModal
          service={editing}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            const ok = await patch(editing.id, body);
            if (ok) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        on ? "bg-primary" : "bg-surface-3"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
          on ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

function EditModal({
  service,
  onClose,
  onSave,
}: {
  service: Service;
  onClose: () => void;
  onSave: (body: Partial<Service>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    custom_name: service.custom_name ?? "",
    custom_description: service.custom_description ?? "",
    platform: service.platform ?? "outros",
    category: service.category ?? "outros",
    pricing_mode: service.pricing_mode,
    sale_price: service.sale_price,
    markup_percentage: service.markup_percentage,
    multiplier: service.multiplier,
    minimum_margin_percentage: service.minimum_margin_percentage,
    min_quantity: service.min_quantity,
    max_quantity: service.max_quantity,
    featured: service.featured,
  });
  const [saving, setSaving] = useState(false);

  const preview = computeSalePricePer1000({
    pricing_mode: form.pricing_mode,
    sale_price: form.sale_price,
    provider_cost: service.provider_cost,
    markup_percentage: form.markup_percentage,
    multiplier: form.multiplier,
  } as Service);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar serviço"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            loading={saving}
            onClick={async () => {
              setSaving(true);
              await onSave({
                custom_name: form.custom_name || null,
                custom_description: form.custom_description || null,
                platform: form.platform,
                category: form.category,
                pricing_mode: form.pricing_mode,
                sale_price: Number(form.sale_price),
                markup_percentage: Number(form.markup_percentage),
                multiplier: Number(form.multiplier),
                minimum_margin_percentage: Number(form.minimum_margin_percentage),
                min_quantity: Number(form.min_quantity),
                max_quantity: Number(form.max_quantity),
                featured: form.featured,
              });
              setSaving(false);
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
        <Input
          label="Nome exibido"
          value={form.custom_name}
          onChange={(e) => set("custom_name", e.target.value)}
          placeholder="Ex.: Seguidores Instagram BR"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-fg-muted">Descrição</label>
          <textarea
            value={form.custom_description}
            onChange={(e) => set("custom_description", e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-primary"
            placeholder="🇧🇷 Brasileiros · ⚡ Início rápido"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select label="Plataforma" value={form.platform} onChange={(v) => set("platform", v)}
            options={PLATFORMS.map((p) => ({ value: p.id, label: p.label }))} />
          <Select label="Categoria" value={form.category} onChange={(v) => set("category", v)}
            options={CATEGORIES.map((c) => ({ value: c.id, label: c.label }))} />
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-4">
          <Select label="Estratégia de preço" value={form.pricing_mode}
            onChange={(v) => set("pricing_mode", v as Service["pricing_mode"])}
            options={[
              { value: "markup", label: "Markup (%)" },
              { value: "multiplier", label: "Multiplicador (x)" },
              { value: "manual", label: "Preço manual" },
            ]} />

          <div className="mt-3">
            {form.pricing_mode === "manual" && (
              <Input label="Preço de venda / 1.000 (R$)" type="number" value={form.sale_price}
                onChange={(e) => set("sale_price", Number(e.target.value))} />
            )}
            {form.pricing_mode === "markup" && (
              <Input label="Markup (%)" type="number" value={form.markup_percentage}
                onChange={(e) => set("markup_percentage", Number(e.target.value))} />
            )}
            {form.pricing_mode === "multiplier" && (
              <Input label="Multiplicador (x)" type="number" step="0.1" value={form.multiplier}
                onChange={(e) => set("multiplier", Number(e.target.value))} />
            )}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg bg-surface p-3 text-sm">
            <span className="text-fg-muted">
              Custo: {formatBRL(service.provider_cost)} /1k
            </span>
            <span className="font-semibold text-fg">Venda: {formatBRL(preview)} /1k</span>
          </div>
        </div>

        <Input label="Margem mínima (%) — bloqueia venda abaixo" type="number"
          value={form.minimum_margin_percentage}
          onChange={(e) => set("minimum_margin_percentage", Number(e.target.value))} />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Qtd mínima" type="number" value={form.min_quantity}
            onChange={(e) => set("min_quantity", Number(e.target.value))} />
          <Input label="Qtd máxima" type="number" value={form.max_quantity}
            onChange={(e) => set("max_quantity", Number(e.target.value))} />
        </div>

        <label className="flex items-center gap-3">
          <input type="checkbox" checked={form.featured}
            onChange={(e) => set("featured", e.target.checked)}
            className="h-4 w-4 accent-[var(--primary)]" />
          <span className="text-sm text-fg">Marcar como destaque</span>
        </label>
      </div>
    </Modal>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-fg-muted">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-sm text-fg outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
