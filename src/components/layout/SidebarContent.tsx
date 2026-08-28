"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/config/nav";
import { cn } from "@/lib/utils/cn";
import { UserMenu, type SidebarProfile } from "./UserMenu";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Navegación + bloque de usuario. Lo reutilizan tanto el Sidebar de
// escritorio como el MobileDrawer para no duplicar la lógica de estado activo.
export function SidebarContent({ profile }: { profile: SidebarProfile }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} className={groupIndex > 0 ? "mt-6" : undefined}>
            {group.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              const isExternal = "external" in item && item.external;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-accent-soft font-medium text-text-primary"
                      : "text-text-muted hover:bg-bg-sunken hover:text-text-primary",
                  )}
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-accent"
                    />
                  ) : null}
                  <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{item.label}</span>
                  {isExternal ? (
                    <ExternalLink aria-hidden="true" className="ml-auto h-3.5 w-3.5 shrink-0" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <UserMenu profile={profile} />
    </div>
  );
}
