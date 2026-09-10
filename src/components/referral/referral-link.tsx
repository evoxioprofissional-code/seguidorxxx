"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ReferralLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  }

  const waMsg = encodeURIComponent(
    `Cresça nas redes sociais! Cadastre-se pelo meu link: ${link}`
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-2">
        <code className="flex-1 truncate px-2 text-sm text-fg-muted">{link}</code>
        <Button size="sm" onClick={copy} className="gap-1.5">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <a href={`https://wa.me/?text=${waMsg}`} target="_blank" rel="noopener noreferrer">
        <Button variant="secondary" className="w-full gap-2">
          <Share2 className="h-4 w-4" /> Compartilhar no WhatsApp
        </Button>
      </a>
    </div>
  );
}
