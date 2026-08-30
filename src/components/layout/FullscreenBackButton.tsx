"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { copy } from "@/config/copy";

// router.back() en vez de un href fijo: esta capa la usan varias páginas
// (plan semanal, y a futuro cotizador/calculadora — ver ROADMAP.md §10.14),
// cada una entra desde un lugar distinto. Volver al historial real es lo
// único que funciona igual para todas sin que cada página tenga que decirle
// a dónde regresar.
export function FullscreenBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
      {copy.common.back}
    </button>
  );
}
