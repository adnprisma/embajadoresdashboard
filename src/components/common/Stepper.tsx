"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// Sobre Tabs.Root/List/Trigger de Radix: los pasos futuros se marcan
// `disabled`, y Radix ya se encarga de que ni el teclado ni el clic los
// disparen — así "solo permite volver a pasos completados" sale gratis.
export function Stepper({
  steps,
  current,
  onStepClick,
}: {
  steps: string[];
  current: number;
  onStepClick: (index: number) => void;
}) {
  return (
    <Tabs.Root value={String(current)} onValueChange={(next) => onStepClick(Number(next))}>
      <Tabs.List aria-label="Pasos" className="flex items-center">
        {steps.map((step, index) => {
          const completed = index < current;
          const active = index === current;
          const disabled = index > current;

          return (
            <div key={step} className="flex flex-1 items-center last:flex-none">
              <Tabs.Trigger
                value={String(index)}
                disabled={disabled}
                className={cn(
                  "flex items-center gap-2 rounded-[var(--radius-control)] px-2 py-1 text-sm font-medium transition-colors",
                  disabled ? "text-text-muted" : "cursor-pointer text-text-primary",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    active && "border-accent bg-accent text-text-on-coral",
                    completed && !active && "border-accent bg-accent-soft text-text-primary",
                    disabled && "border-border-subtle text-text-muted",
                  )}
                >
                  {completed && !active ? <Check className="h-3.5 w-3.5" strokeWidth={2} /> : index + 1}
                </span>
                {step}
              </Tabs.Trigger>
              {index < steps.length - 1 ? (
                <div
                  aria-hidden="true"
                  className={cn("mx-2 h-px flex-1", completed ? "bg-accent" : "bg-border-subtle")}
                />
              ) : null}
            </div>
          );
        })}
      </Tabs.List>
    </Tabs.Root>
  );
}
