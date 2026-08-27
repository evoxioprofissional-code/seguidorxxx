import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Evita que o Turbopack suba a raiz até o diretório home (package-lock.json solto).
  turbopack: {
    root: path.join(__dirname),
  },
  experimental: {
    // Autoriza os domínios próprios a executar Server Actions (login/cadastro).
    // Sem isso, o Next bloqueia a ação por CSRF atrás do domínio da Vercel.
    serverActions: {
      allowedOrigins: [
        "seguidorx.com.br",
        "www.seguidorx.com.br",
        "*.vercel.app",
      ],
    },
  },
};

export default nextConfig;
