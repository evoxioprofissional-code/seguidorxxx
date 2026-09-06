"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UserRoleToggle({
  userId,
  isAdmin,
  isSelf,
}: {
  userId: string;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setRole(role: "admin" | "user") {
    const label = role === "admin" ? "promover esta conta a admin" : "remover o admin desta conta";
    if (!confirm(`Tem certeza que deseja ${label}?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(role === "admin" ? "Conta promovida a admin." : "Admin removido.");
        router.refresh();
      } else {
        toast.error(data.error ?? "Falha ao atualizar.");
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold">Permissão de admin</h2>
      <p className="mt-1 text-sm text-fg-muted">
        {isAdmin
          ? "Esta conta é administradora — acessa todo o painel."
          : "Esta conta é de usuário comum."}
      </p>

      {isAdmin ? (
        <Button
          variant="danger"
          onClick={() => setRole("user")}
          loading={loading}
          className="mt-4 w-full gap-2"
        >
          <ShieldOff className="h-4 w-4" /> Remover admin
        </Button>
      ) : (
        <Button
          onClick={() => setRole("admin")}
          loading={loading}
          className="mt-4 w-full gap-2"
        >
          <ShieldCheck className="h-4 w-4" /> Tornar admin
        </Button>
      )}

      {isSelf && (
        <p className="mt-2 text-xs text-warning">
          Atenção: você está editando a sua própria conta.
        </p>
      )}
    </div>
  );
}
