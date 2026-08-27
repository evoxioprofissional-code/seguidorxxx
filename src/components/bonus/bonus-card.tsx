"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatNumber } from "@/lib/format";
import type { BonusGrant } from "@/types/database";

export function BonusCard({ bonuses }: { bonuses: BonusGrant[] }) {
  const router = useRouter();
  const [claiming, setClaiming] = useState<BonusGrant | null>(null);
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);

  const pending = bonuses.filter((b) => b.status === "pending");
  if (pending.length === 0) return null;

  async function claim() {
    if (!claiming) return;
    if (!link.trim()) return toast.error("Informe o link do seu Instagram.");
    setLoading(true);
    try {
      const res = await fetch(`/api/bonus/${claiming.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Bônus resgatado! Seus seguidores já estão a caminho.");
        setClaiming(null);
        setLink("");
        router.push(`/orders/${data.orderId}`);
        router.refresh();
      } else {
        toast.error(data.error ?? "Não foi possível resgatar.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="space-y-3">
        {pending.map((b) => (
          <div
            key={b.id}
            className="relative overflow-hidden rounded-xl border border-primary/30 p-5"
            style={{
              background:
                "linear-gradient(100deg, rgba(124,58,237,0.18), rgba(139,92,246,0.06))",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary-soft">
                  <Gift className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-medium text-primary-soft">Bônus liberado</p>
                  <p className="text-lg font-bold text-fg">
                    {formatNumber(b.followers)} seguidores grátis no Instagram
                  </p>
                </div>
              </div>
              <Button onClick={() => setClaiming(b)}>Resgatar agora</Button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={claiming !== null}
        onClose={() => !loading && setClaiming(null)}
        title="Resgatar seguidores grátis"
        footer={
          <>
            <Button variant="secondary" onClick={() => setClaiming(null)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={claim} loading={loading}>
              Resgatar
            </Button>
          </>
        }
      >
        {claiming && (
          <div className="space-y-4">
            <p className="text-sm text-fg-muted">
              Você vai receber{" "}
              <b className="text-fg">{formatNumber(claiming.followers)} seguidores</b> no seu
              perfil. Informe o link do seu Instagram (perfil público):
            </p>
            <Input
              placeholder="https://instagram.com/seuperfil"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              icon={<Link2 className="h-4 w-4" />}
            />
            <p className="text-xs text-fg-subtle">
              Confira o link com atenção — a entrega vai pro perfil informado.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
