import type { ReactNode } from "react";
import { Illustration } from "@/components/common/Illustration";
import { Logo } from "@/components/layout/Logo";

// Layout de las pantallas sin sesión: centrado, fondo beige, tarjeta blanca.
// La ilustración es acompañamiento lateral (DESIGN_SYSTEM.md §5) — solo en
// desktop, para no competir con el formulario en pantallas angostas.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4 py-12">
      <div className="flex w-full max-w-3xl items-center justify-center gap-10">
        <Illustration name="crear" size="xl" alt="" className="hidden shrink-0 lg:block" />
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <Logo height={34} />
          <div
            id="main-content"
            className="w-full rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
