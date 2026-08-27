"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus, Trash2, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import type { ApiKey } from "@/types/database";

export function ApiPanel({
  initialKeys,
  apiUrl,
}: {
  initialKeys: ApiKey[];
  apiUrl: string;
}) {
  const router = useRouter();
  const [keys, setKeys] = useState(initialKeys);
  const [generating, setGenerating] = useState(false);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  async function generate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Chave de API" }),
      });
      const data = await res.json();
      if (res.ok) {
        setKeys((k) => [data.key, ...k]);
        setReveal((r) => ({ ...r, [data.key.id]: true }));
        toast.success("Chave gerada! Guarde em local seguro.");
      } else toast.error(data.error ?? "Falha ao gerar chave.");
    } finally {
      setGenerating(false);
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      setKeys((k) => k.filter((x) => x.id !== id));
      toast.success("Chave revogada.");
      router.refresh();
    } else toast.error("Falha ao revogar.");
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  }

  const mask = (k: string) => k.slice(0, 6) + "•".repeat(14) + k.slice(-4);

  return (
    <div className="space-y-6">
      {/* chaves */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">Suas chaves de API</h2>
            <p className="text-xs text-fg-subtle">Use para integrar seu site como revendedor.</p>
          </div>
          <Button size="sm" onClick={generate} loading={generating} className="gap-1.5">
            <Plus className="h-4 w-4" /> Gerar chave
          </Button>
        </div>

        {keys.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<KeyRound className="h-6 w-6" />}
              title="Nenhuma chave ainda"
              description="Gere uma chave para começar a revender via API."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {keys.map((k) => (
              <div key={k.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <KeyRound className="h-4 w-4 shrink-0 text-primary-soft" />
                <code className="min-w-0 flex-1 truncate font-mono text-sm text-fg-muted">
                  {reveal[k.id] ? k.key : mask(k.key)}
                </code>
                <button
                  onClick={() => setReveal((r) => ({ ...r, [k.id]: !r[k.id] }))}
                  className="text-fg-subtle hover:text-fg"
                  title={reveal[k.id] ? "Ocultar" : "Mostrar"}
                >
                  {reveal[k.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => copy(k.key)} className="text-fg-subtle hover:text-fg" title="Copiar">
                  <Copy className="h-4 w-4" />
                </button>
                <span className="hidden text-xs text-fg-subtle sm:block">
                  {formatDate(k.created_at)}
                </span>
                <button
                  onClick={() => revoke(k.id)}
                  className="text-fg-subtle hover:text-danger"
                  title="Revogar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* documentação */}
      <div className="card p-5">
        <h2 className="font-semibold">Documentação</h2>
        <p className="mt-1 text-sm text-fg-muted">
          API padrão de mercado. Todas as chamadas: <b>POST</b> em{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-primary-soft">{apiUrl}</code>{" "}
          com <code className="rounded bg-surface-2 px-1.5 py-0.5">application/x-www-form-urlencoded</code>, resposta JSON.
        </p>

        <div className="mt-5 space-y-5 text-sm">
          <Doc
            title="Listar serviços"
            code={`key=SUA_CHAVE\naction=services`}
            resp={`[{ "service": 101, "name": "Seguidores Instagram", "rate": "7.50",\n  "min": "100", "max": "10000", "refill": true, "cancel": false }]`}
          />
          <Doc title="Consultar saldo" code={`key=SUA_CHAVE\naction=balance`} resp={`{ "balance": "150.00", "currency": "BRL" }`} />
          <Doc
            title="Criar pedido"
            code={`key=SUA_CHAVE\naction=add\nservice=101\nlink=https://instagram.com/perfil\nquantity=1000`}
            resp={`{ "order": 100123 }`}
          />
          <Doc
            title="Status do pedido"
            code={`key=SUA_CHAVE\naction=status\norder=100123`}
            resp={`{ "charge": "7.50", "start_count": "1200", "status": "Completed",\n  "remains": "0", "currency": "BRL" }`}
          />
          <Doc title="Status em lote (até 100)" code={`key=SUA_CHAVE\naction=status\norders=100123,100124`} resp={`{ "100123": {...}, "100124": {...} }`} />
          <Doc title="Reposição" code={`key=SUA_CHAVE\naction=refill\norder=100123`} resp={`{ "refill": "abc123" }`} />
          <Doc title="Cancelamento" code={`key=SUA_CHAVE\naction=cancel\norders=100123`} resp={`[{ "order": 100123, "cancel": 1 }]`} />
        </div>

        <div className="mt-6 rounded-xl border border-border bg-surface-2 p-4">
          <p className="mb-2 text-xs font-medium text-fg-muted">Exemplo com cURL:</p>
          <pre className="overflow-x-auto text-xs text-fg-muted">
{`curl -X POST ${apiUrl} \\
  -d "key=SUA_CHAVE" \\
  -d "action=add" \\
  -d "service=101" \\
  -d "link=https://instagram.com/perfil" \\
  -d "quantity=1000"`}
          </pre>
        </div>
      </div>
    </div>
  );
}

function Doc({ title, code, resp }: { title: string; code: string; resp: string }) {
  return (
    <div>
      <p className="mb-1.5 font-medium text-fg">{title}</p>
      <div className="grid gap-2 md:grid-cols-2">
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 text-xs text-fg-muted">
{code}
        </pre>
        <pre className="overflow-x-auto rounded-lg border border-border bg-surface-2 p-3 text-xs text-success">
{resp}
        </pre>
      </div>
    </div>
  );
}
