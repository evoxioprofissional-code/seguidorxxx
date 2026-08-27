"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, RotateCcw, XCircle, Check, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { formatBRL, formatDateTime, formatNumber } from "@/lib/format";
import { OPEN_STATUSES } from "@/lib/orders/status";
import type { Order, OrderStatus } from "@/types/database";

const TIMELINE: { key: string; label: string }[] = [
  { key: "received", label: "Pedido recebido" },
  { key: "paid", label: "Pagamento confirmado" },
  { key: "sent", label: "Enviado ao sistema" },
  { key: "processing", label: "Em processamento" },
  { key: "done", label: "Concluído" },
];

function activeStep(status: OrderStatus): number {
  switch (status) {
    case "pending":
    case "submitting":
      return 2;
    case "processing":
    case "partial":
      return 3;
    case "completed":
      return 4;
    case "canceled":
    case "failed":
    case "refunded":
      return 2;
    default:
      return 1;
  }
}

export function OrderDetail({ order: initial }: { order: Order }) {
  const router = useRouter();
  const [order, setOrder] = useState(initial);
  const [syncing, setSyncing] = useState(false);
  const [action, setAction] = useState<"refill" | "cancel" | null>(null);
  const [busy, setBusy] = useState(false);

  const step = activeStep(order.status);
  const delivered =
    order.start_count != null && order.remains != null
      ? order.quantity - order.remains
      : null;
  const progress =
    delivered != null ? Math.min(100, Math.round((delivered / order.quantity) * 100)) : null;

  async function sync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/sync`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setOrder((o) => ({
          ...o,
          status: data.status ?? o.status,
          provider_status: data.provider_status ?? o.provider_status,
          remains: data.remains ?? o.remains,
          start_count: data.start_count ?? o.start_count,
        }));
        toast.success("Status atualizado.");
        router.refresh();
      } else {
        toast.error(data.error ?? "Falha ao atualizar.");
      }
    } finally {
      setSyncing(false);
    }
  }

  async function runAction() {
    if (!action) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/${action}`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          action === "refill" ? "Reposição solicitada!" : "Cancelamento solicitado!"
        );
        setAction(null);
        router.refresh();
      } else {
        toast.error(data.error ?? "Não foi possível concluir.");
      }
    } finally {
      setBusy(false);
    }
  }

  const canRefill = order.has_refill && ["completed", "partial"].includes(order.status);
  const canCancel = order.has_cancel && ["pending", "processing"].includes(order.status);
  const canSync = OPEN_STATUSES.includes(order.status);

  // Aviso pro cliente ansioso: enquanto está em andamento, tranquiliza —
  // e se estiver demorando mais que o normal, reforça que vai chegar.
  const isOpen = ["pending", "submitting", "processing", "partial"].includes(order.status);
  const ageMin = (Date.now() - new Date(order.created_at).getTime()) / 60000;
  const isDelayed = isOpen && ageMin > 30;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-fg-subtle">#{order.public_order_id}</p>
            <h1 className="mt-1 text-xl font-bold text-fg">{order.service_name ?? "Serviço"}</h1>
            <div className="mt-2">
              <StatusBadge status={order.status} />
            </div>
          </div>
          {canSync && (
            <Button variant="secondary" size="sm" onClick={sync} loading={syncing} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </Button>
          )}
        </div>

        {progress != null && (
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-xs text-fg-muted">
              <span>Entregue</span>
              <span>
                {formatNumber(delivered ?? 0)} / {formatNumber(order.quantity)} ({progress}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-strong transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* aviso de acompanhamento pro cliente */}
      {isOpen && (
        <div
          className={
            "flex items-start gap-3 rounded-xl border p-4 " +
            (isDelayed
              ? "border-warning/30 bg-warning/10"
              : "border-primary/25 bg-primary/10")
          }
        >
          {isDelayed ? (
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          ) : (
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary-soft" />
          )}
          <div className="text-sm">
            {isDelayed ? (
              <>
                <p className="font-medium text-fg">Está levando um pouco mais que o normal</p>
                <p className="mt-1 text-fg-muted">
                  Em momentos de alta demanda a entrega pode atrasar um pouco, mas fique
                  tranquilo: seu pedido está <b>garantido</b> e será entregue. Não precisa
                  refazer nem pagar de novo. 💜
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-fg">Pedido em andamento</p>
                <p className="mt-1 text-fg-muted">
                  Já estamos processando. Costuma chegar rapidinho — acompanhe o progresso
                  aqui mesmo.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* detalhes */}
      <div className="card divide-y divide-border">
        <Detail label="Link" value={order.link} mono />
        <Detail label="Quantidade" value={formatNumber(order.quantity)} />
        <Detail label="Valor pago" value={formatBRL(order.customer_price)} />
        {order.start_count != null && (
          <Detail label="Contagem inicial" value={formatNumber(order.start_count)} />
        )}
        {order.remains != null && (
          <Detail label="Restante" value={formatNumber(order.remains)} />
        )}
        <Detail label="Data" value={formatDateTime(order.created_at)} />
      </div>

      {/* timeline */}
      <div className="card p-6">
        <h2 className="mb-4 font-semibold">Acompanhamento</h2>
        <ol className="relative space-y-5">
          {TIMELINE.map((t, i) => {
            const done = i < step;
            const current = i === step - 1;
            const failed =
              ["canceled", "failed", "refunded"].includes(order.status) && i >= step;
            return (
              <li key={t.key} className="flex items-center gap-3">
                <span
                  className={
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs " +
                    (done
                      ? "border-success bg-success/15 text-success"
                      : current
                        ? "border-primary bg-primary/15 text-primary-soft"
                        : failed
                          ? "border-danger/40 bg-danger/10 text-danger"
                          : "border-border bg-surface-2 text-fg-subtle")
                  }
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span
                  className={
                    done || current ? "text-sm text-fg" : "text-sm text-fg-subtle"
                  }
                >
                  {t.label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ações */}
      {(canRefill || canCancel) && (
        <div className="flex flex-wrap gap-3">
          {canRefill && (
            <Button variant="secondary" onClick={() => setAction("refill")} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Solicitar reposição
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" onClick={() => setAction("cancel")} className="gap-2">
              <XCircle className="h-4 w-4" /> Solicitar cancelamento
            </Button>
          )}
        </div>
      )}

      <Modal
        open={action !== null}
        onClose={() => !busy && setAction(null)}
        title={action === "refill" ? "Solicitar reposição" : "Solicitar cancelamento"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)} disabled={busy}>
              Voltar
            </Button>
            <Button onClick={runAction} loading={busy}>
              Confirmar
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          {action === "refill"
            ? "Vamos pedir ao sistema a reposição das unidades que caíram. Isso pode levar algumas horas."
            : "O cancelamento será solicitado ao sistema. O estorno, quando aplicável, ocorre somente após a confirmação."}
        </p>
      </Modal>
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <span className="text-sm text-fg-muted">{label}</span>
      <span
        className={
          "max-w-[65%] truncate text-sm font-medium text-fg " + (mono ? "font-mono text-xs" : "")
        }
      >
        {value}
      </span>
    </div>
  );
}
