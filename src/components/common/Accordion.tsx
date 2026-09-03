"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

// Radix Collapsible + las animaciones de altura ya definidas en
// animations.css (`animate-collapsible-down/up`, 250ms ease-in-out —
// DESIGN_SYSTEM.md §6, misma entrada que el panel "Completadas" de
// /tareas). Respeta prefers-reduced-motion porque esas clases ya viven
// dentro de ese media query, no hace falta repetirlo aquí.
export function Accordion({
  trigger,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  className,
}: {
  trigger: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  return (
    <Collapsible.Root
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
      className={cn("rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface", className)}
    >
      <Collapsible.Trigger className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        {trigger}
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-text-muted transition-transform duration-150 group-data-[state=open]:rotate-180"
          strokeWidth={1.75}
        />
      </Collapsible.Trigger>
      <Collapsible.Content className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="border-t border-border-subtle px-4 py-3">{children}</div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
