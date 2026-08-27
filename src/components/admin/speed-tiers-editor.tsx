"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Tier {
  label: string;
  ids: string; // texto separado por vírgula/espaço/linha
}

export function SpeedTiersEditor({
  initial,
}: {
  initial: { label: string; ids: string[] }[];
}) {
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>(
    initial.length
      ? initial.map((t) => ({ label: t.label, ids: t.ids.join(", ") }))
      : [
          { label: "Entrega na hora", ids: "" },
          { label: "Início 0–30min", ids: "" },
          { label: "Início 1–3h", ids: "" },
        ]
  );
  const [saving, setSaving] = useState(false);

  function update(i: number, patch: Partial<Tier>) {
    setTiers((t) => t.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function add() {
    setTiers((t) => [...t, { label: "", ids: "" }]);
  }
  function remove(i: number) {
    setTiers((t) => t.filter((_, idx) => idx !== i));
  }

  async function save() {
    const payload = tiers
      .map((t, idx) => ({
        label: t.label.trim(),
        rank: idx + 1,
        ids: t.ids
          .split(/[\s,;]+/)
          .map((x) => x.trim())
          .filter(Boolean),
      }))
      .filter((t) => t.label && t.ids.length > 0);

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speed_tiers: payload }),
      });
      if (res.ok) {
        toast.success("Velocidades salvas! Os serviços já foram pro topo.");
        router.refresh();
      } else toast.error("Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary-soft">
            <Zap className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">Como funciona</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Quando o fornecedor avisar quais serviços estão mais rápidos, cole os{" "}
              <b>IDs do fornecedor</b> na faixa certa. Esses serviços vão automaticamente
              pro <b>topo do catálogo</b> com o selo do tempo de entrega. A faixa de cima é
              a mais rápida.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {tiers.map((t, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-3 text-xs font-bold text-fg-muted">
                {i + 1}
              </span>
              <div className="flex-1">
                <Input
                  value={t.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder="Nome da faixa (ex.: Entrega na hora)"
                />
              </div>
              <button
                onClick={() => remove(i)}
                className="text-fg-subtle hover:text-danger"
                title="Remover faixa"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={t.ids}
              onChange={(e) => update(i, { ids: e.target.value })}
              rows={2}
              className="mt-2 w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="IDs do fornecedor separados por vírgula. Ex.: 1276, 1154, 1188"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={add} className="gap-1.5">
          <Plus className="h-4 w-4" /> Adicionar faixa
        </Button>
        <Button onClick={save} loading={saving}>
          Salvar velocidades
        </Button>
      </div>
    </div>
  );
}
