"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils/cn";

// Construido sobre Tabs.Root/List/Trigger de Radix SIN Tabs.Content: Radix ya
// resuelve role="tablist", flechas ←/→, roving tabindex y aria-selected — no
// hay que reimplementar nada de eso a mano.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Tabs.Root value={value} onValueChange={(next) => onChange(next as T)}>
      <Tabs.List className="inline-flex items-center gap-1 rounded-[var(--radius-control)] border border-border-subtle bg-bg-sunken p-1">
        {options.map((option) => (
          <Tabs.Trigger
            key={option.value}
            value={option.value}
            className={cn(
              "rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-sm font-medium text-text-muted transition-colors",
              "hover:text-text-primary",
              "data-[state=active]:bg-bg-surface data-[state=active]:text-text-primary data-[state=active]:shadow-[var(--shadow-card)]",
            )}
          >
            {option.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
