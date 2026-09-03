import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { FullscreenBackButton } from "@/components/layout/FullscreenBackButton";
import { Logo } from "@/components/layout/Logo";
import { getCurrentProfile } from "@/lib/supabase/get-current-profile";

// Sin sidebar — para pantallas de revisión que se leen con calma, no en un
// diálogo (ver ROADMAP.md §10.14/10.15, donde ya estaba planeado este grupo
// para cotizador/calculadora). middleware.ts ya protege esto igual que
// (app) (su matcher cubre todo menos assets estáticos); esto es la misma
// defensa en profundidad que (app)/layout.tsx.
export default async function FullscreenGroupLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-bg-base print:bg-white">
      {/* print:hidden — este header trae el logo aprobado SOLO para la
      interfaz interna (ver CLAUDE.md §2). Nunca debe llegar a lo impreso,
      que es exactamente el caso que esa regla excluye. */}
      <header className="flex items-center justify-between border-b border-border-subtle bg-bg-surface px-4 py-3 lg:px-8 print:hidden">
        <FullscreenBackButton />
        <Logo variant="carbon" form="isotipo" height={24} />
        <div className="w-[72px]" aria-hidden="true" />
      </header>
      <main className="mx-auto w-full max-w-[var(--content-max-width)] px-4 py-6 lg:px-8 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
