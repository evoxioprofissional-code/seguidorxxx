"use client";

import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signInAction, signUpAction, type AuthResult } from "@/app/(auth)/actions";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/dashboard";

  const action = mode === "login" ? signInAction : signUpAction;
  const [state, formAction, pending] = useActionState<AuthResult, FormData>(
    action,
    {}
  );

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) {
      toast.success(mode === "login" ? "Bem-vindo de volta!" : "Conta criada!");
      router.push(redirectTo);
      router.refresh();
    }
  }, [state, mode, redirectTo, router]);

  return (
    <div className="animate-in">
      <h2 className="text-2xl font-bold tracking-tight">
        {mode === "login" ? "Entrar na conta" : "Criar sua conta"}
      </h2>
      <p className="mt-1.5 text-sm text-fg-muted">
        {mode === "login"
          ? "Acesse seu painel e acompanhe seus pedidos."
          : "Leva menos de um minuto. Comece a crescer hoje."}
      </p>

      <form action={formAction} className="mt-7 space-y-4">
        {mode === "signup" && (
          <Input
            name="name"
            label="Nome"
            placeholder="Seu nome"
            autoComplete="name"
            required
            icon={<User className="h-4 w-4" />}
          />
        )}
        <Input
          name="email"
          type="email"
          label="E-mail"
          placeholder="voce@email.com"
          autoComplete="email"
          required
          icon={<Mail className="h-4 w-4" />}
        />
        <Input
          name="password"
          type="password"
          label="Senha"
          placeholder="••••••••"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          icon={<Lock className="h-4 w-4" />}
        />

        <Button type="submit" size="lg" loading={pending} className="w-full">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fg-muted">
        {mode === "login" ? (
          <>
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-medium text-primary-soft hover:underline">
              Cadastre-se
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-primary-soft hover:underline">
              Entrar
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
