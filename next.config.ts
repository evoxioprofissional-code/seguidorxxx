import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Evita que o Turbopack suba a raiz até o diretório home (package-lock.json solto).
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
