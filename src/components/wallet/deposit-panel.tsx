"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, QrCode, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatBRL } from "@/lib/format";

const QUICK = [20, 50, 100, 200, 500];

interface Charge {
  id: string;
  amount: number;
  qr_code: string;
  qr_code_base64: string | null;
}

export function DepositPanel({
  minDeposit,
  isMock,
}: {
  minDeposit: number;
  isMock: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState<number>(50);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [charge, setCharge] = useState<Charge | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function generate() {
    if (amount < minDeposit) {
      toast.error(`Depósito mínimo: ${formatBRL(minDeposit)}.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao gerar pagamento.");
        return;
      }
      setCharge(data.payment);
      setOpen(true);
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  async function simulatePaid() {
    if (!charge) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/payments/${charge.id}/confirm`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Pagamento confirmado! Saldo creditado.");
        setOpen(false);
        setCharge(null);
        router.refresh();
      } else {
        toast.error(data.error ?? "Falha ao confirmar.");
      }
    } finally {
      setConfirming(false);
    }
  }

  function copy() {
    if (!charge) return;
    navigator.clipboard.writeText(charge.qr_code);
    toast.success("Código PIX copiado!");
  }

  return (
    <>
      <div className="card p-6">
        <h2 className="font-semibold">Adicionar saldo</h2>
        <p className="mt-1 text-sm text-fg-muted">Recarregue via PIX e comece a comprar.</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {QUICK.map((v) => (
            <button
              key={v}
              onClick={() => setAmount(v)}
              className={
                "rounded-xl border px-4 py-2 text-sm font-medium transition-colors " +
                (amount === v
                  ? "border-primary/50 bg-primary/12 text-primary-soft"
                  : "border-border bg-surface-2 text-fg-muted hover:text-fg")
              }
            >
              {formatBRL(v)}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              label="Valor"
              type="number"
              min={minDeposit}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              hint={`Mínimo ${formatBRL(minDeposit)}`}
            />
          </div>
          <Button onClick={generate} loading={loading} size="lg" className="gap-2 sm:w-auto">
            <QrCode className="h-4 w-4" /> Gerar PIX
          </Button>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => !confirming && setOpen(false)}
        title="Pagamento via PIX"
      >
        {charge && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-fg-muted">Valor</p>
              <p className="text-3xl font-bold text-fg">{formatBRL(charge.amount)}</p>
            </div>

            {charge.qr_code_base64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${charge.qr_code_base64}`}
                alt="QR Code PIX"
                className="mx-auto h-52 w-52 rounded-xl bg-white p-2"
              />
            ) : (
              <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-border bg-surface-2 text-fg-subtle">
                <QrCode className="h-16 w-16" />
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-medium text-fg-muted">PIX copia e cola</p>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-2">
                <code className="flex-1 truncate text-xs text-fg-muted">{charge.qr_code}</code>
                <button
                  onClick={copy}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 hover:bg-[#2a2a35]"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isMock ? (
              <div className="rounded-xl border border-warning/25 bg-warning/10 p-3">
                <p className="text-xs text-warning">
                  Ambiente de teste: nenhum pagamento real é cobrado.
                </p>
                <Button
                  onClick={simulatePaid}
                  loading={confirming}
                  className="mt-3 w-full gap-2"
                >
                  <Check className="h-4 w-4" /> Simular pagamento aprovado
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-fg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguardando confirmação do pagamento...
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
