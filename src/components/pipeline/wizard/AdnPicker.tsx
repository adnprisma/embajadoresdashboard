"use client";

import { MoneyValue } from "@/components/common/MoneyValue";
import { copy } from "@/config/copy";
import type { AdnTier } from "@/config/pricing";
import type { LineSelection } from "./types";

const CHECKBOX_CLASSES = "h-4 w-4 shrink-0 accent-accent";
const PRICE_INPUT_CLASSES =
  "numeric w-28 rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-2 py-1 text-right text-sm text-text-primary";

// Sin acordeón — solo 3 tiers, no hace falta colapsarlos. Combinables entre
// sí (pricing.ts lo deja explícito): checkboxes, no radio buttons.
export function AdnPicker({
  availableTiers,
  selections,
  onToggle,
  onPriceChange,
}: {
  availableTiers: AdnTier[];
  selections: LineSelection[];
  onToggle: (tier: AdnTier, checked: boolean) => void;
  onPriceChange: (itemId: string, price: number) => void;
}) {
  if (availableTiers.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-4">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{copy.pipeline.wizard.content.adnTitle}</h3>
        <p className="text-xs text-text-muted">{copy.pipeline.wizard.content.adnHint}</p>
      </div>
      <div className="divide-y divide-border-subtle">
        {availableTiers.map((tier) => {
          const selection = selections.find((entry) => entry.itemId === tier.id);
          const checked = selection !== undefined;

          return (
            <div key={tier.id} className="flex flex-col gap-1.5 py-2">
              <label className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => onToggle(tier, event.target.checked)}
                  className={CHECKBOX_CLASSES}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text-primary">{tier.name}</span>
                  <span className="block text-xs text-text-secondary">{tier.description}</span>
                </span>
                <MoneyValue amount={tier.price} />
              </label>
              {checked ? (
                <div className="flex items-center gap-2 pl-[26px]">
                  <span className="text-xs text-text-muted">{copy.pipeline.wizard.content.priceInputLabel}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={selection.price}
                    onChange={(event) => onPriceChange(tier.id, Number(event.target.value))}
                    className={PRICE_INPUT_CLASSES}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
