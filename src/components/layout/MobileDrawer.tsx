"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { copy } from "@/config/copy";
import { SidebarContent } from "./SidebarContent";
import type { SidebarProfile } from "./UserMenu";

export function MobileDrawer({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: SidebarProfile;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-carbon/40 data-[state=open]:animate-overlay-fade-in lg:hidden" />
        <Dialog.Content
          className="fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col bg-bg-surface shadow-[var(--shadow-raised)] data-[state=open]:animate-drawer-slide-in lg:hidden"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-end px-4 py-4">
            <Dialog.Title asChild>
              <span className="sr-only">{copy.shell.mobileMenu.title}</span>
            </Dialog.Title>
            <Dialog.Close
              aria-label={copy.shell.mobileMenu.closeLabel}
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-text-primary transition-colors hover:bg-bg-sunken"
            >
              <X aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1">
            <SidebarContent profile={profile} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
