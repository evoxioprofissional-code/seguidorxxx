"use client";

import { useActionState, useEffect } from "react";
import { User, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  updateNameAction,
  updatePasswordAction,
  type AccountResult,
} from "@/app/(app)/conta/actions";

export function AccountSettings({ name, email }: { name: string; email: string }) {
  const [nameState, nameAction, namePending] = useActionState<AccountResult, FormData>(
    updateNameAction,
    {}
  );
  const [pwState, pwAction, pwPending] = useActionState<AccountResult, FormData>(
    updatePasswordAction,
    {}
  );

  useEffect(() => {
    if (nameState.error) toast.error(nameState.error);
    if (nameState.success) toast.success(nameState.success);
  }, [nameState]);

  useEffect(() => {
    if (pwState.error) toast.error(pwState.error);
    if (pwState.success) toast.success(pwState.success);
  }, [pwState]);

  return (
    <div className="space-y-5">
      {/* Perfil */}
      <form action={nameAction} className="card space-y-4 p-6">
        <h2 className="font-semibold">Perfil</h2>
        <Input
          label="E-mail"
          defaultValue={email}
          disabled
          icon={<Mail className="h-4 w-4" />}
          hint="O e-mail de acesso não é alterado por aqui."
        />
        <Input
          name="name"
          label="Nome"
          defaultValue={name}
          placeholder="Seu nome"
          autoComplete="name"
          required
          icon={<User className="h-4 w-4" />}
        />
        <Button type="submit" loading={namePending}>
          Salvar nome
        </Button>
      </form>

      {/* Senha */}
      <form action={pwAction} className="card space-y-4 p-6">
        <h2 className="font-semibold">Senha</h2>
        <Input
          name="password"
          type="password"
          label="Nova senha"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          icon={<Lock className="h-4 w-4" />}
          hint="Mínimo 6 caracteres. Troca direta, sem pedir a senha atual."
        />
        <Button type="submit" loading={pwPending}>
          Trocar senha
        </Button>
      </form>
    </div>
  );
}
