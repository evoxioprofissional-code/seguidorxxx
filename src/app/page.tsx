import Link from "next/link";
import {
  ArrowRight,
  Wallet,
  MousePointerClick,
  Rocket,
  ShieldCheck,
  Zap,
  RefreshCw,
  BarChart3,
  HeartHandshake,
  Clock,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/catalog/platform-icon";
import { Faq } from "@/components/landing/faq";
import { getUser } from "@/lib/auth";
import { PLATFORMS } from "@/lib/catalog/taxonomy";

export default async function LandingPage() {
  const user = await getUser();
  const primaryHref = user ? "/dashboard" : "/cadastro";

  const platforms = PLATFORMS.filter((p) =>
    ["instagram", "tiktok", "youtube", "facebook", "kwai", "telegram"].includes(p.id)
  );

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-fg-muted md:flex">
            <a href="#como-funciona" className="hover:text-fg">Como funciona</a>
            <a href="#servicos" className="hover:text-fg">Serviços</a>
            <a href="#beneficios" className="hover:text-fg">Benefícios</a>
            <a href="#faq" className="hover:text-fg">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard">
                <Button size="sm">Meu painel</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">Entrar</Button>
                </Link>
                <Link href="/cadastro">
                  <Button size="sm">Começar agora</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-5 py-20 sm:py-28">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(45rem 30rem at 50% -10%, rgba(124,58,237,0.22), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-1.5 text-xs text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Entrega automática · Pagamento via PIX
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Cresça nas redes.
            <br />
            <span className="text-gradient">Sem complicação.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-fg-muted">
            Seguidores, curtidas, visualizações e muito mais em poucos cliques. Um
            painel moderno, rápido e seguro para impulsionar sua presença online.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={primaryHref}>
              <Button size="lg" className="gap-2">
                Começar agora <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#servicos">
              <Button size="lg" variant="secondary">Ver serviços</Button>
            </a>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {platforms.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5">
                <PlatformIcon platform={p.id} size={22} />
                <span className="text-sm text-fg-muted">{p.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionTitle eyebrow="Simples assim" title="Como funciona" />
          <div className="mt-10 grid gap-5 md:grid-cols-4">
            {[
              { icon: Wallet, title: "Adicione saldo", desc: "Recarregue via PIX em segundos." },
              { icon: MousePointerClick, title: "Escolha o serviço", desc: "Selecione plataforma e quantidade." },
              { icon: Rocket, title: "Envie o pedido", desc: "Informe o link e confirme." },
              { icon: BarChart3, title: "Acompanhe tudo", desc: "Status em tempo real no painel." },
            ].map((s, i) => (
              <div key={i} className="card relative p-6">
                <span className="absolute right-4 top-4 text-4xl font-bold text-surface-3">
                  {i + 1}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary-soft">
                  <s.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-fg">{s.title}</h3>
                <p className="mt-1 text-sm text-fg-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionTitle eyebrow="Catálogo" title="Serviços para cada rede" />
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {PLATFORMS.filter((p) => p.id !== "outros").map((p) => (
              <div key={p.id} className="card flex items-center gap-3 p-5">
                <PlatformIcon platform={p.id} size={40} />
                <div>
                  <p className="font-medium text-fg">{p.label}</p>
                  <p className="text-xs text-fg-subtle">Seguidores · Curtidas · Views</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionTitle eyebrow="Por que o SeguidorX" title="Feito para você crescer" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Zap, title: "Início rápido", desc: "A maioria dos pedidos começa em minutos." },
              { icon: ShieldCheck, title: "Pagamento seguro", desc: "PIX com confirmação automática pelo backend." },
              { icon: RefreshCw, title: "Reposição", desc: "Solicite refill em serviços com garantia." },
              { icon: Clock, title: "Acompanhamento 24/7", desc: "Status sincronizado automaticamente." },
              { icon: HeartHandshake, title: "Suporte de verdade", desc: "Estamos aqui quando você precisar." },
              { icon: BarChart3, title: "Painel completo", desc: "Histórico, carteira e pedidos num só lugar." },
            ].map((b, i) => (
              <div key={i} className="card p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary-soft">
                  <b.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-fg">{b.title}</h3>
                <p className="mt-1 text-sm text-fg-muted">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <SectionTitle eyebrow="Dúvidas" title="Perguntas frequentes" />
          <div className="mt-10">
            <Faq />
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="card relative overflow-hidden p-10 text-center">
            <div
              className="absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(30rem 20rem at 50% 0%, rgba(124,58,237,0.25), transparent 65%)",
              }}
            />
            <h2 className="text-3xl font-bold tracking-tight">
              Pronto para <span className="text-gradient">decolar?</span>
            </h2>
            <p className="mx-auto mt-3 max-w-md text-fg-muted">
              Crie sua conta gratuitamente e faça seu primeiro pedido em minutos.
            </p>
            <Link href={primaryHref}>
              <Button size="lg" className="mt-7 gap-2">
                Criar conta grátis <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border px-5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo size={28} />
          <p className="text-xs text-fg-subtle">
            © {new Date().getFullYear()} SeguidorX. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center">
      <p className="text-sm font-medium text-primary-soft">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
    </div>
  );
}
