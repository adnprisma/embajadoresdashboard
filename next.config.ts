import type { NextConfig } from "next";
import path from "path";

// Fija la raíz del workspace: hay un pnpm-lock.yaml ajeno al proyecto en
// el home del usuario que Next detecta y confunde con la raíz.
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
