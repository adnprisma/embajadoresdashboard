"use client";

import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

// Carbón, no coral, para el estado marcado: en una lista pueden marcarse
// varias casillas a la vez, y el coral es un acento de UNO solo por
// pantalla (ver DESIGN_SYSTEM.md §2).
export function Checkbox({
  checked,
  onCheckedChange,
  ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel?: string;
}) {
  return (
    <RadixCheckbox.Root
      checked={checked}
      onCheckedChange={(state) => onCheckedChange(state === true)}
      aria-label={ariaLabel}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-border-strong bg-bg-surface transition-colors data-[state=checked]:border-carbon data-[state=checked]:bg-carbon"
    >
      <RadixCheckbox.Indicator>
        <Check aria-hidden="true" className="h-3.5 w-3.5 text-white" strokeWidth={3} />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}
