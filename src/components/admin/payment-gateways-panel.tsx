"use client";

import { useEffect, useState } from "react";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  Power,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GatewayStatus {
  id: string;
  label: string;
  requiresCpf: boolean;
  configured: boolean;
  connected: boolean;
  accountLabel: string | null;
  maskedKey: string | null;
  hasWebhookSecret: boolean;
  env: string;
  source: "painel" | "env" | null;
}

interface ApiData {
  active: string;
  gateways: GatewayStatus[];
}

interface FormState {
  apiKey: string;
  webhookSecret: string;
  env: string;
  saving: boolean;
  activating: boolean;
}

const emptyForm = (env = "production"): FormState => ({
  apiKey: "",
  webhookSecret: "",
  env,
  saving: false,
  activating: false,
});

export function PaymentGatewaysPanel() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<string, FormState>>({});
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/payments");
      const json = (await res.json()) as ApiData;
      setData(json);
      setForms((prev) => {
        const next = { ...prev };
        for (const g of json.gateways ?? []) {
          if (!next[g.id]) next[g.id] = emptyForm(g.env);
        }
        return next;
      });
    } catch {
      toast.error("Falha ao carregar os gateways.");
    } finally {
      setLoading(false);
    }
  }

  function patchForm(id: string, patch: Partial<FormState>) {
    setForms((prev) => ({ ...prev, [id]: { ...(prev[id] ?? emptyForm()), ...patch } }));
  }

  async function save(g: GatewayStatus) {
    const form = forms[g.id] ?? emptyForm(g.env);
    if (!form.apiKey.trim() && !g.configured) {
      toast.error("Cole a chave de API antes de conectar.");
      return;
    }
    patchForm(g.id, { saving: true });
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: g.id,
          apiKey: form.apiKey.trim() || undefined,
          webhookSecret: form.webhookSecret.trim() || undefined,
          env: form.env,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Falha ao salvar.");
      } else if (json.ok) {
        toast.success(
          json.accountLabel ? `Conectado: ${json.accountLabel}` : "Conexão OK!"
        );
        if (json.message) toast.message(json.message);
        patchForm(g.id, { apiKey: "", webhookSecret: "" });
        await load();
      } else {
        toast.error(json.message ?? "Não foi possível conectar.");
        await load();
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      patchForm(g.id, { saving: false });
    }
  }

  async function activate(id: string) {
    patchForm(id, { activating: true });
    try {
      const res = await fetch("/api/admin/payments/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Gateway ativado.");
        await load();
      } else toast.error(json.error ?? "Falha ao ativar.");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      patchForm(id, { activating: false });
    }
  }

  async function disconnect(id: string) {
    if (!confirm("Desconectar este gateway? As chaves serão apagadas.")) return;
    try {
      const res = await fetch(`/api/admin/payments?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Gateway desconectado.");
        await load();
      } else toast.error("Falha ao desconectar.");
    } catch {
      toast.error("Erro de conexão.");
    }
  }

  const webhookUrl = origin ? `${origin}/api/payments/webhook` : "/api/payments/webhook";

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("URL do webhook copiada!");
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return (
      <div className="card flex items-center gap-2 p-6 text-fg-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Webhook — URL única para colar no painel do gateway */}
      <div className="card p-5">
        <p className="text-sm font-medium text-fg">URL do Webhook</p>
        <p className="mt-1 text-xs text-fg-subtle">
          Cadastre esta URL no painel do gateway (Asaas ou Mercado Pago) para o saldo
          ser creditado automaticamente após o pagamento.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-2">
          <code className="flex-1 truncate text-xs text-fg-muted">{webhookUrl}</code>
          <button
            onClick={copyWebhook}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 hover:bg-[#2a2a35]"
            aria-label="Copiar URL do webhook"
          >
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {data?.gateways.map((g) => {
        const form = forms[g.id] ?? emptyForm(g.env);
        const isActive = data.active === g.id;
        return (
          <div key={g.id} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary-soft">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-semibold">{g.label}</h2>
                  {g.connected ? (
                    <span className="flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {g.accountLabel ? `Conectado — ${g.accountLabel}` : "Configurado"}
                      {g.source === "env" && " (via variável de ambiente)"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
                      <XCircle className="h-3.5 w-3.5" /> Não conectado
                    </span>
                  )}
                </div>
              </div>
              {isActive ? (
                <span className="flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-xs font-medium text-success">
                  <Zap className="h-3.5 w-3.5" /> Ativo
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => activate(g.id)}
                  loading={form.activating}
                  disabled={!g.configured}
                  className="gap-1.5"
                >
                  <Power className="h-3.5 w-3.5" /> Ativar
                </Button>
              )}
            </div>

            <div className="space-y-3 p-5">
              <Input
                label={g.id === "asaas" ? "Chave de API (access_token)" : "Access Token"}
                type="password"
                autoComplete="off"
                placeholder={g.maskedKey ? `${g.maskedKey} — deixe em branco p/ manter` : "Cole a chave aqui"}
                value={form.apiKey}
                onChange={(e) => patchForm(g.id, { apiKey: e.target.value })}
              />
              <Input
                label={g.id === "asaas" ? "Token do webhook (asaas-access-token)" : "Segredo do webhook (x-signature)"}
                type="password"
                autoComplete="off"
                placeholder={g.hasWebhookSecret ? "•••••••• — deixe em branco p/ manter" : "Token do webhook"}
                value={form.webhookSecret}
                onChange={(e) => patchForm(g.id, { webhookSecret: e.target.value })}
              />

              {g.id === "asaas" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg-muted">Ambiente</label>
                  <select
                    value={form.env}
                    onChange={(e) => patchForm(g.id, { env: e.target.value })}
                    className="h-11 w-full rounded-xl border border-border bg-surface-2 px-4 text-sm text-fg outline-none focus:border-primary"
                  >
                    <option value="production">Produção (dinheiro real)</option>
                    <option value="sandbox">Sandbox (teste)</option>
                  </select>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={() => save(g)} loading={form.saving} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Salvar e testar
                </Button>
                {g.source === "painel" && (
                  <Button variant="ghost" onClick={() => disconnect(g.id)}>
                    Desconectar
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Modo teste */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-sm font-medium text-fg">Modo teste (simulado)</p>
          <p className="text-xs text-fg-subtle">
            PIX fictício, sem cobrança real — útil para testar o fluxo.
          </p>
        </div>
        {data?.active === "mock" ? (
          <span className="flex items-center gap-1.5 rounded-full bg-warning/12 px-3 py-1 text-xs font-medium text-warning">
            <Zap className="h-3.5 w-3.5" /> Ativo
          </span>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => activate("mock")}>
            Usar modo teste
          </Button>
        )}
      </div>
    </div>
  );
}
