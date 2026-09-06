"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Plug, CheckCircle2, XCircle, Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL, timeAgo } from "@/lib/format";

interface TestResult {
  configured: boolean;
  connected: boolean;
  source?: "painel" | "env" | null;
  maskedKey?: string | null;
  balanceBrl?: number;
  currency?: string;
  error?: string;
}

export function IntegrationsPanel({
  serviceCount,
  lastSync,
}: {
  serviceCount: number;
  lastSync: string | null;
}) {
  const router = useRouter();
  const [test, setTest] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);

  async function runTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/provider/test");
      setTest(await res.json());
    } catch {
      setTest({ configured: true, connected: false, error: "Falha de rede" });
    } finally {
      setTesting(false);
    }
  }

  useEffect(() => {
    runTest();
  }, []);

  async function saveKey() {
    if (!apiKey.trim() && !test?.configured) {
      toast.error("Cole a chave da API antes de conectar.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao salvar.");
      } else if (data.connected) {
        toast.success(data.message ? `Conectado! ${data.message}` : "Conectado!");
        setApiKey("");
        await runTest();
        router.refresh();
      } else {
        toast.error(data.message ?? "Chave salva, mas a conexão falhou.");
        await runTest();
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/services/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${data.fetched} serviços sincronizados.`);
        router.refresh();
      } else toast.error(data.error ?? "Falha na sincronização.");
    } finally {
      setSyncing(false);
    }
  }

  const statusNode = testing ? (
    <span className="flex items-center gap-2 text-fg-muted">
      <Loader2 className="h-4 w-4 animate-spin" /> Testando...
    </span>
  ) : !test?.configured ? (
    <span className="flex items-center gap-2 text-warning">
      <XCircle className="h-4 w-4" /> API não configurada
    </span>
  ) : test.connected ? (
    <span className="flex items-center gap-2 text-success">
      <CheckCircle2 className="h-4 w-4" /> Conectado
      {test.source === "env" && (
        <span className="text-fg-subtle">(via variável de ambiente)</span>
      )}
    </span>
  ) : (
    <span className="flex items-center gap-2 text-danger">
      <XCircle className="h-4 w-4" /> Falha na conexão
    </span>
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary-soft">
          <Plug className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold">Barato Sociais</h2>
          <p className="text-xs text-fg-subtle">Fornecedor de serviços SMM</p>
        </div>
      </div>

      <dl className="divide-y divide-border">
        <Item label="Status" value={statusNode} />
        {test?.maskedKey && <Item label="Chave" value={<code className="text-xs">{test.maskedKey}</code>} />}
        <Item
          label="Saldo do fornecedor"
          value={
            test?.connected && test.balanceBrl != null ? formatBRL(test.balanceBrl) : "—"
          }
        />
        <Item label="Serviços encontrados" value={String(serviceCount)} />
        <Item label="Última sincronização" value={lastSync ? timeAgo(lastSync) : "nunca"} />
        {test?.error && !test.connected && <Item label="Erro" value={test.error} />}
      </dl>

      {/* Conectar / atualizar a chave da API */}
      <div className="space-y-3 border-t border-border p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-fg">
          <KeyRound className="h-4 w-4 text-fg-muted" />
          Chave da API do fornecedor
        </div>
        <Input
          type="password"
          autoComplete="off"
          placeholder={
            test?.configured
              ? "Chave já configurada — deixe em branco p/ manter"
              : "Cole aqui a chave da API da Barato Sociais"
          }
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          hint="Fica guardada com segurança no servidor — nunca aparece aqui inteira."
        />
        <Button onClick={saveKey} loading={saving} className="gap-2">
          <CheckCircle2 className="h-4 w-4" /> Salvar e conectar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-border p-5">
        <Button variant="secondary" onClick={runTest} loading={testing} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Testar conexão
        </Button>
        <Button onClick={sync} loading={syncing} disabled={!test?.configured} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Sincronizar serviços
        </Button>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 text-sm">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="font-medium text-fg">{value}</dd>
    </div>
  );
}
