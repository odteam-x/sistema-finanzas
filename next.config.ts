import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ambas exportan un componente por ícono/animación (miles de nombres);
  // sin esto Next igual las tree-shakea vía ESM, pero con esto el
  // resolver trata cada import como su propio módulo desde el principio
  // en vez de barrer el árbol del paquete completo — build y dev más
  // rápidos, mismo bundle final.
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react", "framer-motion"],
  },
};

export default nextConfig;
