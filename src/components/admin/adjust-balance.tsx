"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/format";

export function AdjustBalance({ userId, balance }: { userId: string; balance: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!amount || amount === 0) return toast.error("Informe um valor diferente de zero.");
    if (reason.trim().length < 3) return toast.error("Informe o motivo do ajuste.");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Saldo ajustado. Novo saldo: ${formatBRL(data.balance)}`);
        setAmount(0);
        setReason("");
        router.refresh();
      } else {
        toast.error(data.error ?? "Falha ao ajustar.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold">Ajustar saldo</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Use valores positivos para creditar e negativos para debitar. Tudo é registrado.
      </p>
      <div className="mt-4 space-y-3">
        <Input
          label="Valor (R$)"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          hint="Ex.: 50 credita, -20 debita"
        />
        <Input
          label="Motivo"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex.: bônus promocional"
        />
        <Button onClick={submit} loading={loading} className="w-full">
          Aplicar ajuste
        </Button>
      </div>
    </div>
  );
}
