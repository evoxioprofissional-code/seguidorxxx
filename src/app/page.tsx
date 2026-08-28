import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/catalog/platform-icon";
import { getUser } from "@/lib/auth";

export default async function LandingPage() {
  const user = await getUser();
  const primaryHref = user ? "/dashboard" : "/cadastro";
  const platforms = ["instagram", "tiktok", "youtube", "facebook", "kwai", "telegram"];

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-6">
          <Logo size={30} />
          <div className="flex items-center gap-1">
            {user ? (
              <Link href="/dashboard"><Button size="sm">Meu painel</Button></Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Entrar</Button>
                </Link>
                <Link href="/cadastro"><Button size="sm">Criar conta</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grid-bg" aria-hidden />
        <div
          className="pointer-events-none absolute -left-40 top-1/3 h-[36rem] w-[36rem] rounded-full opacity-[0.13] blur-[120px]"
          style={{ background: "var(--primary)" }}
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-5xl px-6">
          <p className="mb-6 flex items-center gap-2.5 text-sm text-fg-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Feito pra quem cansou de painel ruim
          </p>

          <h1 className="display max-w-3xl text-[3.4rem] leading-[0.95] text-fg sm:text-[5rem] lg:text-[6.5rem]">
            Cresça nas redes.
            <br />
            <span className="text-primary">Sem enrolação.</span>
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-fg-muted">
            Seguidores, curtidas e views de verdade — Instagram, TikTok, YouTube e mais.
            Paga no Pix, entra na hora, você acompanha tudo.
          </p>

          <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link href={primaryHref}>
              <Button size="lg" className="gap-2 px-8">
                Começar agora <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-sm text-fg-subtle">Leva 1 minuto. Sem mensalidade.</span>
          </div>

          <div className="mt-20 flex items-center gap-5">
            <span className="text-xs uppercase tracking-widest text-fg-subtle">Funciona em</span>
            <div className="flex items-center gap-4">
              {platforms.map((p) => (
                <PlatformIcon key={p} platform={p} size={26} className="opacity-70" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Um momento: o produto de verdade */}
      <section className="border-t border-border bg-bg-soft">
        <div className="mx-auto grid max-w-5xl items-center gap-14 px-6 py-24 lg:grid-cols-2 lg:py-32">
          <div>
            <h2 className="display text-4xl leading-tight text-fg sm:text-5xl">
              Do Pix ao resultado
              <br />
              em poucos cliques.
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-fg-muted">
              Escolhe o serviço, cola o link, confirma. O pedido é enviado na hora e o
              status aparece em tempo real — sem você ficar no escuro.
            </p>
            <Link
              href={primaryHref}
              className="mt-8 inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary-soft"
            >
              Ver serviços e preços <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <ProductPreview />
        </div>
      </section>

      {/* Fechamento */}
      <section className="mx-auto w-full max-w-5xl px-6 py-28">
        <h2 className="display max-w-2xl text-4xl leading-tight text-fg sm:text-6xl">
          Bora fazer seu perfil crescer?
        </h2>
        <div className="mt-10 flex items-center gap-6">
          <Link href={primaryHref}>
            <Button size="lg" className="gap-2 px-8">
              Criar conta grátis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          {!user && (
            <Link href="/login" className="text-sm text-fg-muted hover:text-fg">
              já tenho conta
            </Link>
          )}
        </div>
      </section>

      <footer className="mt-auto border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Logo size={24} />
          <p className="text-xs text-fg-subtle">
            © {new Date().getFullYear()} SeguidorX
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Prévia real do produto — não é ilustração genérica. */
function ProductPreview() {
  return (
    <div className="rounded-xl border border-border-strong bg-surface shadow-lg">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-surface-3" />
        <span className="h-2.5 w-2.5 rounded-full bg-surface-3" />
        <span className="h-2.5 w-2.5 rounded-full bg-surface-3" />
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-center gap-3">
          <PlatformIcon platform="instagram" size={42} />
          <div>
            <p className="font-medium text-fg">Seguidores Instagram</p>
            <p className="text-xs text-fg-subtle">Brasileiros · Início rápido</p>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 p-4">
          <div>
            <p className="text-xs text-fg-subtle">1.000 seguidores</p>
            <p className="text-2xl font-semibold text-fg">R$ 8,77</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white">
            Comprar <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="font-mono text-fg-subtle">#SX-100128</span>
          <span className="inline-flex items-center gap-1.5 text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Concluído em 4 min
          </span>
        </div>
      </div>
    </div>
  );
}
