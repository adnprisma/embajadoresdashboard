"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell } from "lucide-react";
import { copy } from "@/config/copy";

// Sin dato real de notificaciones todavía (llega con la capa de datos del
// bloque 6+). Muestra honestamente el estado vacío en vez de inventar un
// contador o una lista de ejemplo.
export function NotificationsBell() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={copy.shell.notifications.buttonLabel}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken hover:text-text-primary"
        >
          <Bell aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-72 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-3 shadow-[var(--shadow-raised)]"
        >
          <p className="text-sm font-medium text-text-primary">{copy.shell.notifications.title}</p>
          <p className="mt-1 text-sm text-text-muted">{copy.shell.notifications.empty}</p>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
