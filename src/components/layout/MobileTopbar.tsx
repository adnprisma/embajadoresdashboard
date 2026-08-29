"use client";

import { Menu } from "lucide-react";
import { copy } from "@/config/copy";
import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";

export function MobileTopbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border-subtle bg-bg-surface px-4 py-3 lg:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={copy.shell.mobileMenu.openLabel}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-text-primary transition-colors hover:bg-bg-sunken"
      >
        <Menu aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
      </button>
      <Logo height={26} />
      <NotificationsBell />
    </header>
  );
}
