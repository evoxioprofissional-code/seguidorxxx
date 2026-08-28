import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Zap,
  ShieldCheck,
  RefreshCw,
  Headset,
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
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo size={30} />
          <nav className="hidden items-center gap-7 text-[0.9rem] text-fg-muted md:flex">
            <a href="#servicos" className="transition-colors hover:text-fg">Serviços</a>
            <a href="#como" className="transition-colors hover:text-fg">Como funciona</a>
            <a href="#duvidas" className="transition-colors hover:text-fg">Dúvidas</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard"><Button size="sm">Meu painel</Button></Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">Entrar</Button>
                </Link>
                <Link href="/cadastro"><Button size="sm">Criar conta</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          {/* Coluna esquerda */}
          <div className="animate-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3 py-1 text-xs text-fg-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Entrega automática · Pagamento via Pix
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-fg sm:text-[3.4rem]">
              Mais seguidores.
              <br />
              Menos enrolação.
            </h1>
            <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-fg-muted">
              Seguidores, curtidas e visualizações para Instagram, TikTok, YouTube e outras
              redes. Você paga no Pix, o pedido cai na hora e você acompanha tudo pelo painel.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={primaryHref}>
                <Button size="lg" className="w-full gap-2 sm:w-auto">
                  Começar agora <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#servicos">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Ver serviços e preços
                </Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fg-subtle">
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Sem senha do seu perfil</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Início em minutos</span>
              <span className="flex items-center gap-1.5"><Check className="h-4 w-4 text-primary" /> Suporte humano</span>
            </div>
          </div>

          {/* Coluna direita — prévia do produto */}
          <div className="relative animate-in [animation-delay:120ms]">
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* Faixa de plataformas */}
      <section className="border-b border-border bg-bg-soft">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-5 py-7">
          <span className="text-sm text-fg-subtle">Funciona em</span>
          {platforms.map((p) => (
            <div key={p.id} className="flex items-center gap-2 opacity-80 transition-opacity hover:opacity-100">
              <PlatformIcon platform={p.id} size={24} />
              <span className="text-sm font-medium text-fg-muted">{p.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="mx-auto w-full max-w-6xl px-5 py-20">
        <SectionHead
          kicker="Catálogo"
          title="Um serviço para cada objetivo"
          desc="Escolha a rede, o tipo de serviço e a quantidade. Preço transparente por 1.000."
        />
        <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.filter((p) => p.id !== "outros").map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-surface p-5 transition-colors hover:bg-surface-2">
              <PlatformIcon platform={p.id} size={40} />
              <div>
                <p className="font-medium text-fg">{p.label}</p>
                <p className="text-sm text-fg-subtle">Seguidores · Curtidas · Views</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section id="como" className="border-y border-border bg-bg-soft">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <SectionHead kicker="Como funciona" title="Do Pix ao resultado, em 4 passos" />
          <div className="mt-12 grid gap-10 md:grid-cols-4">
            {[
              { n: "01", t: "Adicione saldo", d: "Recarregue via Pix. Cai na hora." },
              { n: "02", t: "Escolha o serviço", d: "Selecione a rede e a quantidade." },
              { n: "03", t: "Cole o link", d: "Informe seu perfil ou publicação." },
              { n: "04", t: "Acompanhe", d: "Veja o status em tempo real." },
            ].map((s) => (
              <div key={s.n} className="relative">
                <span className="font-mono text-sm text-primary">{s.n}</span>
                <div className="mt-3 h-px w-full bg-border" />
                <h3 className="mt-4 text-lg font-medium text-fg">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20">
        <SectionHead kicker="Por que o SeguidorX" title="Feito para funcionar de verdade" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Zap, t: "Início rápido", d: "A maioria dos pedidos começa em minutos." },
            { icon: ShieldCheck, t: "Pagamento seguro", d: "Pix com confirmação automática." },
            { icon: RefreshCw, t: "Reposição", d: "Peça refill nos serviços com garantia." },
            { icon: Headset, t: "Suporte humano", d: "Gente de verdade quando precisar." },
          ].map((b) => (
            <div key={b.t} className="card p-5">
              <b.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-medium text-fg">{b.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="duvidas" className="border-y border-border bg-bg-soft">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <SectionHead kicker="Dúvidas" title="Perguntas frequentes" />
          <div className="mt-10"><Faq /></div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto w-full max-w-6xl px-5 py-24">
        <div className="relative overflow-hidden rounded-xl border border-border bg-surface p-10 text-center sm:p-16">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" aria-hidden />
          <h2 className="relative text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Pronto para crescer?
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-fg-muted">
            Crie sua conta grátis e faça o primeiro pedido em poucos minutos.
          </p>
          <Link href={primaryHref} className="relative">
            <Button size="lg" className="mt-8 gap-2">
              Criar conta grátis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <Logo size={26} />
          <p className="text-xs text-fg-subtle">
            © {new Date().getFullYear()} SeguidorX. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHead({ kicker, title, desc }: { kicker: string; title: string; desc?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium text-primary">{kicker}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-fg sm:text-[2.4rem]">{title}</h2>
      {desc && <p className="mt-3 text-fg-muted">{desc}</p>}
    </div>
  );
}

/** Prévia realista do produto (não é template genérico). */
function ProductPreview() {
  return (
    <div className="rounded-xl border border-border-strong bg-surface shadow-lg">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-surface-3" />
        <span className="h-2.5 w-2.5 rounded-full bg-surface-3" />
        <span className="h-2.5 w-2.5 rounded-full bg-surface-3" />
        <span className="ml-2 text-xs text-fg-subtle">seguidorx.com.br</span>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <PlatformIcon platform="instagram" size={40} />
          <div>
            <p className="text-sm font-medium text-fg">Seguidores Instagram</p>
            <p className="text-xs text-fg-subtle">Brasileiros · Início rápido</p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-surface-2 p-3">
          <div className="flex items-center justify-between text-xs text-fg-subtle">
            <span>Quantidade</span>
            <span>1.000</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full w-[62%] rounded-full bg-primary" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 p-3.5">
          <div>
            <p className="text-xs text-fg-subtle">Total</p>
            <p className="text-lg font-semibold text-fg">R$ 8,77</p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-white">
            Comprar <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="text-fg-subtle">Pedido #SX-100128</span>
          <span className="inline-flex items-center gap-1.5 text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Concluído
          </span>
        </div>
      </div>
    </div>
  );
}
