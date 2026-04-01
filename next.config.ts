import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Pula type-checking no build de produção.
    // Rode "npx tsc --noEmit" separadamente para verificar tipos.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
