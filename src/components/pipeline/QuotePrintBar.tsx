"use client";

import { Printer } from "lucide-react";
import { copy } from "@/config/copy";

// print:hidden — esta barra es para quien abre la vista, nunca para lo que
// se imprime o se guarda como PDF.
export function QuotePrintBar() {
  return (
    <div className="mx-auto flex max-w-2xl justify-end pb-4 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors hover:opacity-90"
      >
        <Printer aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
        {copy.pipeline.print.printButton}
      </button>
    </div>
  );
}
