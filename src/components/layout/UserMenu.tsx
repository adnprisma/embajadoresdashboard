"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronsUpDown, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { copy } from "@/config/copy";
import { createClient } from "@/lib/supabase/client";
import { getDisplayName } from "@/lib/utils/display-name";

export type SidebarProfile = {
  fullName: string;
  email: string;
};

export function UserMenu({ profile }: { profile: SidebarProfile }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const displayName = getDisplayName(profile.fullName, profile.email);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(copy.shell.userMenu.signOutError);
      setSigningOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="border-t border-border-subtle p-3">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[var(--radius-control)] p-2 text-left transition-colors hover:bg-bg-sunken"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-text-primary"
            >
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-text-primary">
                {displayName}
              </span>
              <span className="block truncate text-xs text-text-muted">{profile.email}</span>
            </span>
            <ChevronsUpDown
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-text-muted"
              strokeWidth={1.5}
            />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="top"
            align="start"
            sideOffset={8}
            className="z-50 w-56 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-1 shadow-[var(--shadow-raised)]"
          >
            <DropdownMenu.Item asChild>
              <Link
                href="/perfil"
                className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-text-primary outline-none data-[highlighted]:bg-bg-sunken"
              >
                <User aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                {copy.shell.userMenu.profile}
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              disabled={signingOut}
              onSelect={(event) => {
                event.preventDefault();
                handleSignOut();
              }}
              className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-text-primary outline-none data-[highlighted]:bg-bg-sunken data-[disabled]:cursor-default data-[disabled]:opacity-60"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {signingOut ? copy.shell.userMenu.signingOut : copy.shell.userMenu.logout}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
