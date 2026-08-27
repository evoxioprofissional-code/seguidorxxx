import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ShieldCheck, Zap, TrendingUp } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel visual */}
      <div className="relative hidden overflow-hidden border-r border-border bg-bg-soft lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(40rem 30rem at 20% 10%, rgba(124,58,237,0.20), transparent 60%), radial-gradient(40rem 30rem at 90% 90%, rgba(139,92,246,0.14), transparent 60%)",
          }}
        />
        <Link href="/">
          <Logo size={36} />
        </Link>

        <div>
          <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight">
            Cresça nas redes.
            <br />
            <span className="text-gradient">Sem complicação.</span>
          </h1>
          <p className="mt-4 max-w-sm text-fg-muted">
            Seguidores, curtidas, visualizações e muito mais — em poucos cliques,
            com acompanhamento em tempo real.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              { icon: Zap, text: "Início rápido e automático" },
              { icon: ShieldCheck, text: "Pagamento seguro via PIX" },
              { icon: TrendingUp, text: "Reposição quando disponível" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-fg-muted">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/12 text-primary-soft">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-fg-subtle">
          © {new Date().getFullYear()} SeguidorX. Todos os direitos reservados.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size={34} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
