import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";

// Layout de las pantallas sin sesión: centrado, fondo beige, tarjeta blanca.
// Sin ilustración todavía — llegan en el bloque 5.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <Logo />
        <div className="w-full rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
