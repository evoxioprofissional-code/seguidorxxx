"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Plug, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatBRL, timeAgo } from "@/lib/format";

interface TestResult {
  configured: boolean;
  connected: boolean;
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
        <Item
          label="Saldo do fornecedor"
          value={
            test?.connected && test.balanceBrl != null
              ? formatBRL(test.balanceBrl)
              : "—"
          }
        />
        <Item label="Serviços encontrados" value={String(serviceCount)} />
        <Item label="Última sincronização" value={lastSync ? timeAgo(lastSync) : "nunca"} />
        {test?.error && !test.connected && <Item label="Erro" value={test.error} />}
      </dl>

      <div className="flex flex-wrap gap-2 border-t border-border p-5">
        <Button variant="secondary" onClick={runTest} loading={testing} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Testar conexão
        </Button>
        <Button onClick={sync} loading={syncing} disabled={!test?.configured} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Sincronizar serviços
        </Button>
      </div>

      {!test?.configured && !testing && (
        <div className="border-t border-border bg-warning/5 p-5 text-sm text-fg-muted">
          Defina <code className="text-warning">BARATO_SOCIAIS_API_KEY</code> no{" "}
          <code>.env.local</code> para ativar a integração. O restante do sistema funciona normalmente.
        </div>
      )}
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
