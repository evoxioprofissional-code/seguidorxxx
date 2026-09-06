"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { signInAction, signUpAction, type AuthResult } from "@/app/(auth)/actions";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/dashboard";
  const [oauthLoading, setOauthLoading] = useState(false);

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

  async function signInWithGoogle() {
    setOauthLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) {
        toast.error("Não foi possível conectar com o Google.");
        setOauthLoading(false);
      }
      // sucesso → o navegador é redirecionado para o Google.
    } catch {
      toast.error("Erro ao conectar com o Google.");
      setOauthLoading(false);
    }
  }

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

      <Button
        type="button"
        variant="secondary"
        size="lg"
        onClick={signInWithGoogle}
        loading={oauthLoading}
        className="mt-7 w-full gap-2"
      >
        {!oauthLoading && <GoogleIcon />}
        Continuar com Google
      </Button>

      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wide text-fg-subtle">
        <span className="h-px flex-1 bg-border" />
        ou com e-mail
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={formAction} className="space-y-4">
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
