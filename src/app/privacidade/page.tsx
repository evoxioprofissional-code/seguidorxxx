import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export const metadata = {
  title: "Política de Privacidade — SeguidorX",
  description: "Como o SeguidorX coleta, usa e protege seus dados.",
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/"><Logo size={28} /></Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="display text-3xl text-fg sm:text-4xl">Política de Privacidade</h1>
        <p className="mt-2 text-sm text-fg-subtle">Última atualização: setembro de 2026</p>

        <div className="mt-8 space-y-6 text-[0.95rem] leading-relaxed text-fg-muted">
          <p>
            Esta Política de Privacidade descreve como o <strong className="text-fg">SeguidorX</strong> coleta,
            usa e protege as informações dos usuários que utilizam nossa plataforma de serviços
            para redes sociais.
          </p>

          <Section title="1. Informações que coletamos">
            Coletamos apenas os dados necessários para operar o serviço: nome, e-mail e telefone
            informados no cadastro; o histórico de pedidos e transações da sua conta; e os links
            de perfil/publicação que você fornece ao fazer um pedido. Quando você entra com o
            Google, recebemos seu nome e e-mail da conta Google para criar seu acesso.
          </Section>

          <Section title="2. Como usamos seus dados">
            Usamos suas informações para autenticar seu acesso, processar e acompanhar seus
            pedidos, gerenciar seu saldo e pagamentos, oferecer suporte e comunicar avisos
            importantes sobre o serviço. Não vendemos seus dados.
          </Section>

          <Section title="3. Pagamentos">
            Os pagamentos são processados por gateways parceiros (como o gateway de PIX
            configurado na plataforma). Não armazenamos dados sensíveis de pagamento em nossos
            servidores.
          </Section>

          <Section title="4. Senhas">
            Nunca solicitamos a senha das suas redes sociais. Para os serviços, precisamos apenas
            do link público do seu perfil ou publicação.
          </Section>

          <Section title="5. Compartilhamento com terceiros">
            Para executar os pedidos, encaminhamos apenas as informações necessárias (como o link
            e a quantidade) aos nossos fornecedores de serviço. Não compartilhamos seus dados
            pessoais para fins de marketing de terceiros.
          </Section>

          <Section title="6. Segurança">
            Adotamos medidas técnicas para proteger seus dados, incluindo controle de acesso e
            criptografia em trânsito. Ainda assim, nenhum sistema é 100% imune; recomendamos manter
            sua senha em segurança.
          </Section>

          <Section title="7. Seus direitos">
            Você pode acessar, corrigir ou solicitar a exclusão dos seus dados a qualquer momento,
            entrando em contato pelo nosso suporte.
          </Section>

          <Section title="8. Contato">
            Dúvidas sobre esta política? Fale com o suporte pelo botão de WhatsApp disponível no
            site.
          </Section>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-8 text-xs text-fg-subtle">
          © {new Date().getFullYear()} SeguidorX. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      <p className="mt-2">{children}</p>
    </section>
  );
}
