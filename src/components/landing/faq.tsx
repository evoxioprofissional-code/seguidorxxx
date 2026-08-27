"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Como funciona o SeguidorX?",
    a: "Você adiciona saldo via PIX, escolhe o serviço e a quantidade, informa o link e pronto: o pedido é enviado automaticamente e você acompanha o status em tempo real pelo painel.",
  },
  {
    q: "Preciso informar minha senha das redes sociais?",
    a: "Não. Nunca pedimos sua senha. Basta o link público do seu perfil ou da publicação.",
  },
  {
    q: "Em quanto tempo o pedido começa?",
    a: "A maioria dos serviços tem início rápido, geralmente em poucos minutos após a confirmação do pagamento.",
  },
  {
    q: "O que é a reposição (refill)?",
    a: "Em serviços com reposição disponível, se houver queda dentro do período de garantia, você pode solicitar a reposição direto pelo painel, sem custo adicional.",
  },
  {
    q: "Posso cancelar um pedido?",
    a: "Quando o serviço permite, você pode solicitar o cancelamento enquanto o pedido ainda está pendente ou em processamento.",
  },
  {
    q: "O pagamento é seguro?",
    a: "Sim. O saldo só é creditado após a confirmação do pagamento pelo nosso backend. Seus dados ficam protegidos.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {FAQS.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={i} className="card overflow-hidden">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="font-medium text-fg">{f.q}</span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-fg-subtle transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="px-5 pb-4 text-sm text-fg-muted">{f.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
