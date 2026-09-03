"use client";

import { MoneyValue } from "@/components/common/MoneyValue";
import { copy } from "@/config/copy";

const SECONDARY_BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-[var(--radius-control)] border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken disabled:cursor-not-allowed disabled:opacity-60";

const PRIMARY_BUTTON_CLASSES =
  "inline-flex items-center justify-center rounded-[var(--radius-control)] bg-accent px-4 py-2 text-sm font-medium text-text-on-coral transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

// Fija al fondo de la pantalla, no de la página — así el total corriendo y
// los controles de navegación quedan siempre a la vista en móvil, sin
// importar cuánto haya que scrollear en un paso largo (el acordeón de
// categorías, sobre todo). El contenido de la ruta lleva pb suficiente
// (ver QuoteWizard) para que esta barra nunca tape el último elemento.
export function StickyTotalBar({
  total,
  step,
  totalSteps,
  onBack,
  onNext,
  isLastStep,
  onSubmit,
  submitting,
}: {
  total: number;
  step: number;
  totalSteps: number;
  onBack: (() => void) | null;
  onNext: (() => void) | null;
  isLastStep: boolean;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const t = copy.pipeline.wizard;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-bg-surface px-4 py-3 shadow-[var(--shadow-raised)]">
      <div className="mx-auto flex max-w-[var(--content-max-width)] items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
            {t.totalBar.runningTotalLabel}
          </span>
          <span className="text-lg font-semibold">
            <MoneyValue amount={total} />
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onBack ? (
            <button type="button" onClick={onBack} className={SECONDARY_BUTTON_CLASSES}>
              {t.nav.back}
            </button>
          ) : null}
          {isLastStep ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              aria-busy={submitting}
              className={PRIMARY_BUTTON_CLASSES}
            >
              {submitting ? t.summary.submitting : t.summary.submitButton}
            </button>
          ) : (
            <button type="button" onClick={onNext ?? undefined} disabled={!onNext} className={PRIMARY_BUTTON_CLASSES}>
              {t.nav.next}
            </button>
          )}
        </div>
      </div>
      <span className="sr-only">
        {step + 1}/{totalSteps}
      </span>
    </div>
  );
}
