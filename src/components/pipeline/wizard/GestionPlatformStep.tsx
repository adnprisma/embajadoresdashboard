"use client";

import { MoneyValue } from "@/components/common/MoneyValue";
import { copy } from "@/config/copy";
import { GESTION_PLANS, PLATFORM_CONSUMPTION_TIERS, PLATFORM_PLANS } from "@/config/pricing";
import { cn } from "@/lib/utils/cn";
import type { WizardState } from "./types";

const RADIO_TILE_BASE =
  "flex flex-1 flex-col items-center gap-1 rounded-[var(--radius-card)] border-2 px-3 py-2.5 text-center text-sm transition-colors";

const INPUT_CLASSES =
  "numeric w-24 rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-right text-sm text-text-primary";

export function GestionPlatformStep({
  state,
  onGestionChange,
  onPlatformPlanChange,
  onPlatformConsumoChange,
  onWhatsappChange,
  onMesesChange,
}: {
  state: WizardState;
  onGestionChange: (gestionId: string | null) => void;
  onPlatformPlanChange: (planId: string) => void;
  onPlatformConsumoChange: (consumoId: string) => void;
  onWhatsappChange: (included: boolean) => void;
  onMesesChange: (meses: number) => void;
}) {
  const t = copy.pipeline.wizard.gestionPlatform;
  const selectedPlan = PLATFORM_PLANS.find((plan) => plan.id === state.platformPlanId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{t.gestionTitle}</h3>
        <p className="mb-2 text-xs text-text-muted">{t.gestionHint}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onGestionChange(null)}
            className={cn(
              RADIO_TILE_BASE,
              state.gestionId === null ? "border-accent bg-accent-soft text-text-primary" : "border-border-subtle text-text-secondary",
            )}
          >
            {t.gestionNone}
          </button>
          {GESTION_PLANS.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => onGestionChange(plan.id)}
              className={cn(
                RADIO_TILE_BASE,
                state.gestionId === plan.id
                  ? "border-accent bg-accent-soft text-text-primary"
                  : "border-border-subtle text-text-secondary",
              )}
            >
              <span className="font-medium">{plan.name}</span>
              <MoneyValue amount={plan.price} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-text-primary">{t.platformTitle}</h3>
        <p className="mb-2 text-xs text-text-muted">{t.platformHint}</p>

        <div className="flex flex-col gap-3">
          <div>
            <span className="mb-1.5 block text-xs font-medium text-text-muted">{t.planLabel}</span>
            <div className="flex gap-2">
              {PLATFORM_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => onPlatformPlanChange(plan.id)}
                  className={cn(
                    RADIO_TILE_BASE,
                    state.platformPlanId === plan.id
                      ? "border-accent bg-accent-soft text-text-primary"
                      : "border-border-subtle text-text-secondary",
                  )}
                >
                  <span className="font-medium">{plan.name}</span>
                  <MoneyValue amount={plan.price} currency="USD" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium text-text-muted">{t.consumoLabel}</span>
            <div className="flex gap-2">
              {PLATFORM_CONSUMPTION_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => onPlatformConsumoChange(tier.id)}
                  className={cn(
                    RADIO_TILE_BASE,
                    state.platformConsumoId === tier.id
                      ? "border-accent bg-accent-soft text-text-primary"
                      : "border-border-subtle text-text-secondary",
                  )}
                >
                  <span className="font-medium">{tier.name}</span>
                  <MoneyValue amount={tier.price} currency="USD" />
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-3">
            <span className="text-sm text-text-primary">{t.whatsappLabel}</span>
            {selectedPlan?.includesWhatsapp ? (
              <span className="text-xs text-text-muted">{t.whatsappIncludedNote}</span>
            ) : (
              <input
                type="checkbox"
                checked={state.whatsappIncluded}
                onChange={(event) => onWhatsappChange(event.target.checked)}
                className="h-4 w-4 accent-accent"
              />
            )}
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-4">
        <span className="text-sm font-medium text-text-primary">{t.mesesLabel}</span>
        <input
          type="number"
          step="1"
          min="1"
          value={state.mesesDiferimiento}
          onChange={(event) => onMesesChange(Number(event.target.value))}
          className={INPUT_CLASSES}
        />
      </div>
    </div>
  );
}
