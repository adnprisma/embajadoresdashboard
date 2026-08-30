import type { NextConfig } from "next";
import path from "path";

// Fija la raíz del workspace: hay un pnpm-lock.yaml ajeno al proyecto en
// el home del usuario que Next detecta y confunde con la raíz.
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Explícito a propósito, aunque sea el default: `next build` corre
  // tsc como parte del build, y eso es lo único que garantiza que
  // copy.ts (tipado con `as const`, sin index signature) tumbe el build
  // cuando alguien accede a una clave de texto que no existe, en vez de
  // que la ruta reviente en producción. Si algún día alguien pone esto en
  // `true` para "desbloquear" un deploy con prisa, ese día se reabre
  // exactamente este hueco — por eso queda escrito aquí, no implícito.
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
