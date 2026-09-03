"use client";

import { QuoteBreakdown } from "@/components/pipeline/QuoteBreakdown";
import { copy } from "@/config/copy";
import type { QuoteBreakdownData } from "@/lib/queries/quotes";

const INPUT_CLASSES =
  "numeric w-36 rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-right text-sm text-text-primary";

// El preview viene YA calculado (buildPreview, en QuoteWizard) — este
// componente solo pinta, no calcula nada. Es la misma <QuoteBreakdown />
// del bloque 4, sin ningún componente nuevo de desglose.
export function SummaryStep({
  preview,
  precioEspecialInput,
  onPrecioEspecialChange,
}: {
  preview: QuoteBreakdownData;
  precioEspecialInput: string;
  onPrecioEspecialChange: (value: string) => void;
}) {
  const t = copy.pipeline.wizard.summary;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-4">
        <label htmlFor="precio-especial" className="text-sm font-medium text-text-primary">
          {t.specialPriceLabel}
        </label>
        <p className="mb-1 text-xs text-text-muted">{t.specialPriceHint}</p>
        <input
          id="precio-especial"
          type="number"
          step="0.01"
          min="0"
          value={precioEspecialInput}
          onChange={(event) => onPrecioEspecialChange(event.target.value)}
          className={INPUT_CLASSES}
        />
      </div>

      <QuoteBreakdown quote={preview} />
    </div>
  );
}
