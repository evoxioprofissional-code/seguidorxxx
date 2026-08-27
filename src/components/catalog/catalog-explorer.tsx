"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, Link2, RefreshCw, Zap, Check, ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";
import { PlatformIcon } from "./platform-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { formatBRL, formatNumber } from "@/lib/format";
import { RATE_UNIT } from "@/lib/pricing";
import type { PublicService } from "@/lib/catalog/services";

function priceFor(svc: PublicService, qty: number) {
  return Math.round(((svc.pricePer1000 * qty) / RATE_UNIT) * 100) / 100;
}

export function CatalogExplorer({
  services,
  balance,
}: {
  services: PublicService[];
  balance: number;
}) {
  const router = useRouter();
  const [platform, setPlatform] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicService | null>(null);
  const [quantity, setQuantity] = useState(1000);
  const [link, setLink] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idemKey, setIdemKey] = useState("");

  // plataformas disponíveis (com serviços)
  const platforms = useMemo(() => {
    const map = new Map<string, { id: string; label: string; count: number }>();
    for (const s of services) {
      const cur = map.get(s.platform) ?? { id: s.platform, label: s.platformLabel, count: 0 };
      cur.count += 1;
      map.set(s.platform, cur);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [services]);

  const categories = useMemo(() => {
    if (!platform) return [];
    const map = new Map<string, { id: string; label: string; count: number }>();
    for (const s of services) {
      if (s.platform !== platform) continue;
      const cur = map.get(s.category) ?? { id: s.category, label: s.categoryLabel, count: 0 };
      cur.count += 1;
      map.set(s.category, cur);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [services, platform]);

  const list = useMemo(() => {
    return services.filter(
      (s) =>
        (!platform || s.platform === platform) &&
        (!category || s.category === category)
    );
  }, [services, platform, category]);

  function openService(svc: PublicService) {
    setSelected(svc);
    setQuantity(Math.min(Math.max(1000, svc.min), svc.max));
    setLink("");
  }

  function adjust(delta: number) {
    if (!selected) return;
    setQuantity((q) => {
      const step = selected.min >= 1000 ? selected.min : 100;
      const next = q + delta * step;
      return Math.min(Math.max(next, selected.min), selected.max);
    });
  }

  const price = selected ? priceFor(selected, quantity) : 0;
  const insufficient = price > balance;

  async function submit() {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selected.id,
          link,
          quantity,
          idempotencyKey: idemKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Não foi possível concluir o pedido.");
        setSubmitting(false);
        return;
      }
      toast.success(`Pedido ${data.order.public_order_id} criado!`);
      setConfirmOpen(false);
      setSelected(null);
      router.push(`/orders/${data.order.id}`);
      router.refresh();
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
      setSubmitting(false);
    }
  }

  function startConfirm() {
    if (!link.trim()) {
      toast.error("Informe o link do perfil/publicação.");
      return;
    }
    if (insufficient) {
      toast.error("Saldo insuficiente. Adicione saldo para continuar.");
      return;
    }
    setIdemKey(crypto.randomUUID());
    setConfirmOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* Breadcrumb / steps */}
      <div className="mb-6 flex items-center gap-2 text-sm text-fg-muted">
        <button
          onClick={() => {
            setPlatform(null);
            setCategory(null);
            setSelected(null);
          }}
          className={cn("hover:text-fg", !platform && "text-fg font-medium")}
        >
          Plataformas
        </button>
        {platform && (
          <>
            <span className="text-fg-subtle">/</span>
            <button
              onClick={() => {
                setCategory(null);
                setSelected(null);
              }}
              className={cn("hover:text-fg", !category && "text-fg font-medium")}
            >
              {platforms.find((p) => p.id === platform)?.label}
            </button>
          </>
        )}
        {category && (
          <>
            <span className="text-fg-subtle">/</span>
            <span className="text-fg font-medium">
              {categories.find((c) => c.id === category)?.label}
            </span>
          </>
        )}
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title="Catálogo em breve"
          description="Nossos serviços estão sendo preparados. Volte em instantes."
        />
      ) : !platform ? (
        <>
          <h2 className="mb-4 text-lg font-semibold">Escolha a plataforma</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {platforms.map((p) => (
              <motion.button
                key={p.id}
                whileHover={{ y: -3 }}
                onClick={() => setPlatform(p.id)}
                className="card flex flex-col items-center gap-3 p-6 text-center hover:border-primary/40"
              >
                <PlatformIcon platform={p.id} size={52} />
                <div>
                  <p className="font-medium text-fg">{p.label}</p>
                  <p className="text-xs text-fg-subtle">{p.count} serviços</p>
                </div>
              </motion.button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button
            onClick={() => (category ? setCategory(null) : setPlatform(null))}
            className="mb-4 flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>

          {/* categorias */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setCategory(null)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm transition-colors",
                !category
                  ? "border-primary/40 bg-primary/12 text-primary-soft"
                  : "border-border bg-surface-2 text-fg-muted hover:text-fg"
              )}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  category === c.id
                    ? "border-primary/40 bg-primary/12 text-primary-soft"
                    : "border-border bg-surface-2 text-fg-muted hover:text-fg"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {list.map((svc) => (
              <motion.button
                key={svc.id}
                whileHover={{ y: -2 }}
                onClick={() => openService(svc)}
                className={cn(
                  "card flex items-start gap-4 p-4 text-left hover:border-primary/40",
                  selected?.id === svc.id && "border-primary/50 ring-1 ring-primary/30"
                )}
              >
                <PlatformIcon platform={svc.platform} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg">{svc.name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge color="primary">
                      <Zap className="h-3 w-3" /> Início rápido
                    </Badge>
                    {svc.hasRefill && (
                      <Badge color="success">
                        <RefreshCw className="h-3 w-3" /> Reposição
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-fg-muted">
                    A partir de{" "}
                    <span className="font-semibold text-fg">
                      {formatBRL(priceFor(svc, Math.max(1000, svc.min)))}
                    </span>{" "}
                    / {formatNumber(Math.max(1000, svc.min))}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </>
      )}

      {/* Painel de compra */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4"
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="relative z-10 w-full max-w-lg glass rounded-t-2xl sm:rounded-2xl"
            >
              <div className="flex items-start gap-3 border-b border-border p-5">
                <PlatformIcon platform={selected.platform} size={44} />
                <div className="flex-1">
                  <h3 className="font-semibold text-fg">{selected.name}</h3>
                  {selected.description && (
                    <p className="mt-0.5 text-sm text-fg-muted">{selected.description}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-fg-muted">
                    Quantidade
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => adjust(-1)}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 hover:bg-surface-3"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      min={selected.min}
                      max={selected.max}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v)) setQuantity(v);
                      }}
                      onBlur={() =>
                        setQuantity((q) =>
                          Math.min(Math.max(q, selected.min), selected.max)
                        )
                      }
                      className="h-11 flex-1 rounded-xl border border-border bg-surface-2 text-center text-lg font-semibold text-fg outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => adjust(1)}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-2 hover:bg-surface-3"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-fg-subtle">
                    Mín {formatNumber(selected.min)} · Máx {formatNumber(selected.max)}
                  </p>
                </div>

                <Input
                  label="Link do perfil / publicação"
                  placeholder="https://instagram.com/seuperfil"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  icon={<Link2 className="h-4 w-4" />}
                />

                <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-4">
                  <div>
                    <p className="text-xs text-fg-subtle">Preço total</p>
                    <p className="text-2xl font-bold text-fg">{formatBRL(price)}</p>
                  </div>
                  <div className="text-right text-xs text-fg-subtle">
                    <p>Saldo: {formatBRL(balance)}</p>
                    {insufficient && (
                      <p className="mt-0.5 font-medium text-danger">Saldo insuficiente</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 border-t border-border p-5">
                <Button variant="secondary" className="flex-1" onClick={() => setSelected(null)}>
                  Cancelar
                </Button>
                <Button className="flex-1" onClick={startConfirm} disabled={insufficient}>
                  Comprar agora
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de confirmação */}
      <Modal
        open={confirmOpen}
        onClose={() => !submitting && setConfirmOpen(false)}
        title="Confirmar pedido"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Voltar
            </Button>
            <Button onClick={submit} loading={submitting} className="gap-2">
              <Check className="h-4 w-4" /> Confirmar compra
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <Row label="Serviço" value={selected.name} />
            <Row label="Quantidade" value={formatNumber(quantity)} />
            <Row label="Link" value={link} truncate />
            <div className="my-2 border-t border-border" />
            <div className="flex items-center justify-between">
              <span className="text-fg-muted">Total</span>
              <span className="text-lg font-bold text-fg">{formatBRL(price)}</span>
            </div>
            <p className="text-xs text-fg-subtle">
              O valor será debitado do seu saldo e o pedido enviado automaticamente.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value, truncate }: { label: string; value: string; truncate?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-fg-muted">{label}</span>
      <span className={cn("font-medium text-fg", truncate && "max-w-[60%] truncate")}>
        {value}
      </span>
    </div>
  );
}
