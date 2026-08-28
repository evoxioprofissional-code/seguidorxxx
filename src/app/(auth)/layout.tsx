import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Zap, ShieldCheck, RefreshCw } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel visual */}
      <div className="relative hidden overflow-hidden border-r border-border bg-bg-soft lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-70" aria-hidden />
        <Link href="/" className="relative">
          <Logo size={32} />
        </Link>

        <div className="relative">
          <h1 className="max-w-md text-[2.6rem] font-semibold leading-[1.08] tracking-tight text-fg">
            Mais seguidores.
            <br />
            Menos enrolação.
          </h1>
          <p className="mt-4 max-w-sm leading-relaxed text-fg-muted">
            Entrega automática, pagamento no Pix e acompanhamento em tempo real. Do jeito
            que deveria ser.
          </p>

          <ul className="mt-9 space-y-3.5">
            {[
              { icon: Zap, text: "Início em minutos" },
              { icon: ShieldCheck, text: "Pagamento seguro via Pix" },
              { icon: RefreshCw, text: "Reposição quando disponível" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-fg-muted">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-fg-subtle">
          © {new Date().getFullYear()} SeguidorX. Todos os direitos reservados.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size={32} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
